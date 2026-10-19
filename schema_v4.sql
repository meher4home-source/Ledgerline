-- Run AFTER schema.sql. Safe to re-run.
alter table public.profiles add column if not exists paid_plan text;     -- set ONLY by the payment webhook
alter table public.profiles add column if not exists trial_mail text;    -- reminder tracking

create or replace function public.is_live() returns boolean language sql security definer stable set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and (status='active' or trial_ends_at>now())) $$;
create or replace function public.plan_limit(pl text) returns int language sql immutable as $$
  select case pl when 'Starter' then 100 when 'Growth' then 1000 else 1000000 end $$;

-- Enforces trial/active AND the monthly entry limit promised on the pricing page.
create or replace function public.can_write() returns boolean language sql security definer stable set search_path=public as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid() and (p.status='active' or p.trial_ends_at>now())
    and ((select count(*) from public.entries e  where e.user_id=p.id and e.created_at>=date_trunc('month',now()))
       + (select count(*) from public.invoices i where i.user_id=p.id and i.created_at>=date_trunc('month',now())))
        < public.plan_limit(case when p.status='active' then coalesce(p.paid_plan,p.plan) else p.plan end)) $$;

-- Firm features come from what was PAID for (or the plan being trialled), never from a self-chosen plan.
create or replace function public.can_add_client() returns boolean language sql security definer stable set search_path=public as $$
  select public.can_write()
    and exists(select 1 from public.profiles p where p.id=auth.uid()
               and (case when p.status='active' then p.paid_plan else p.plan end)='Firm')
    and (select count(*) from public.clients where user_id=auth.uid())<50 $$;

-- After the trial, editing is blocked too (reading and export still work).
drop policy if exists "inv edit" on public.invoices;
create policy "inv edit" on public.invoices for update using (user_id=auth.uid() and public.is_live());
drop policy if exists "ent edit" on public.entries;
create policy "ent edit" on public.entries for update using (user_id=auth.uid() and public.is_live());

-- Mark paid = one atomic step (no double cash entries, no half-saved state).
create or replace function public.mark_invoice_paid(inv uuid) returns void language plpgsql security definer set search_path=public as $$
declare r public.invoices%rowtype;
begin
  if not public.is_live() then raise exception 'Your trial has ended. Activate your plan to continue.'; end if;
  update public.invoices set status='paid' where id=inv and user_id=auth.uid() and status<>'paid' returning * into r;
  if r.id is null then return; end if;
  insert into public.entries(user_id,entry_date,type,category,amount,note,invoice_id,client_id)
  values (auth.uid(),current_date,'in','Invoice receipt',r.total,r.number||' '||coalesce(r.client,''),r.id,r.client_id);
end $$;
revoke all on function public.mark_invoice_paid(uuid) from public;
grant execute on function public.mark_invoice_paid(uuid) to authenticated;
