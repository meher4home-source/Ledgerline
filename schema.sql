-- Ledgerline database setup. Paste ALL of this in Supabase > SQL Editor > Run. Safe to run again.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, name text, business text, country text, plan text,
  problems jsonb default '[]',
  status text not null default 'trial',
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  onboarded boolean not null default false,
  client_limit int not null default 50,
  auto_remind boolean not null default false,
  created_at timestamptz not null default now());
alter table public.profiles add column if not exists onboarded boolean not null default false;
alter table public.profiles add column if not exists client_limit int not null default 50;
alter table public.profiles add column if not exists auto_remind boolean not null default false;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null, created_at timestamptz default now());

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id uuid references public.clients(id) on delete cascade,
  number text, client text, contact text, issue_date date, items jsonb, tax_rate numeric default 0,
  subtotal numeric, tax numeric, total numeric, status text default 'unpaid',
  created_at timestamptz default now());
alter table public.invoices add column if not exists client_id uuid references public.clients(id) on delete cascade;
alter table public.invoices add column if not exists contact text;
alter table public.invoices add column if not exists reminders_sent int not null default 0;
alter table public.invoices add column if not exists last_reminder date;

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id uuid references public.clients(id) on delete cascade,
  entry_date date, type text check (type in ('in','out')), category text,
  amount numeric not null, note text, invoice_id uuid,
  created_at timestamptz default now());
alter table public.entries add column if not exists client_id uuid references public.clients(id) on delete cascade;

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id uuid references public.clients(id) on delete cascade,
  category text not null, monthly_amount numeric not null check (monthly_amount > 0),
  created_at timestamptz default now());

create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id uuid references public.clients(id) on delete cascade,
  kind text not null, title text not null, data jsonb not null default '{}',
  created_at timestamptz default now(), check (pg_column_size(data) < 200000));

create table if not exists public.portal_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id uuid references public.clients(id) on delete cascade,
  label text,
  token text not null unique default (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  expires_at timestamptz not null default now() + interval '90 days',
  revoked boolean not null default false,
  created_at timestamptz default now());
create table if not exists public.portal_signoffs (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.portal_links(id) on delete cascade,
  name text not null, note text, signed_at timestamptz default now());
create index if not exists clients_user on public.clients(user_id);
create index if not exists invoices_user on public.invoices(user_id);
create index if not exists entries_user on public.entries(user_id, entry_date);
create index if not exists budgets_user on public.budgets(user_id);
create index if not exists records_user on public.records(user_id, kind);

alter table public.profiles enable row level security;
alter table public.clients  enable row level security;
alter table public.invoices enable row level security;
alter table public.entries  enable row level security;
alter table public.budgets  enable row level security;
alter table public.records  enable row level security;
alter table public.portal_links enable row level security;
alter table public.portal_signoffs enable row level security;

-- helper functions ------------------------------------------------------------
create or replace function public.can_write() returns boolean language sql security definer stable set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and (status='active' or trial_ends_at>now())) $$;

create or replace function public.can_add_client() returns boolean language sql security definer stable set search_path=public as $$
  select public.can_write()
    and exists(select 1 from public.profiles where id=auth.uid() and plan='Firm')
    and (select count(*) from public.clients where user_id=auth.uid()) < (select client_limit from public.profiles where id=auth.uid()) $$;

create or replace function public.new_profile() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,email,name)
  values (new.id,new.email,coalesce(new.raw_user_meta_data->>'name',new.raw_user_meta_data->>'full_name'))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_signup on auth.users;
create trigger on_signup after insert on auth.users for each row execute function public.new_profile();

create or replace function public.ensure_profile() returns void language sql security definer set search_path=public as $$
  insert into public.profiles(id,email,name)
  select id,email,coalesce(raw_user_meta_data->>'name',raw_user_meta_data->>'full_name') from auth.users where id=auth.uid()
  on conflict (id) do nothing $$;

-- plan and details are chosen once, at the start of the trial. Payment later sets the plan that was actually paid for.
create or replace function public.complete_onboarding(nm text,bz text,c text,p text,pb jsonb) returns void language sql security definer set search_path=public as $$
  update public.profiles set name=left(nm,100), business=left(bz,150), country=left(c,4),
    plan=case when p in ('Starter','Growth','Firm') then p else 'Growth' end,
    problems=coalesce(pb,'[]'::jsonb), onboarded=true
  where id=auth.uid() and onboarded=false $$;

-- marking an invoice paid and recording the receipt happen together or not at all
create or replace function public.mark_invoice_paid(inv uuid) returns void language plpgsql security definer set search_path=public as $$
declare i public.invoices%rowtype;
begin
  if not public.can_write() then raise exception 'Your trial has ended. Please activate your plan.'; end if;
  select * into i from public.invoices where id=inv and user_id=auth.uid() and status<>'paid' for update;
  if not found then raise exception 'Invoice not found or already paid'; end if;
  update public.invoices set status='paid' where id=inv;
  insert into public.entries(user_id,client_id,entry_date,type,category,amount,note,invoice_id)
  values (auth.uid(),i.client_id,current_date,'in','Invoice receipt',i.total,i.number||' '||i.client,inv);
end $$;

-- fair-use limit per plan (protects the service from abuse)
create or replace function public.enforce_cap() returns trigger language plpgsql security definer set search_path=public as $$
declare n bigint; cap bigint; pl text;
begin
  select plan into pl from public.profiles where id=new.user_id;
  cap := case pl when 'Firm' then 200000 when 'Growth' then 50000 else 10000 end;
  execute format('select count(*) from public.%I where user_id=$1', tg_table_name) into n using new.user_id;
  if n >= cap then raise exception 'Fair-use limit reached for your plan'; end if;
  return new;
end $$;
drop trigger if exists cap_entries on public.entries;
create trigger cap_entries before insert on public.entries for each row execute function public.enforce_cap();
drop trigger if exists cap_invoices on public.invoices;
create trigger cap_invoices before insert on public.invoices for each row execute function public.enforce_cap();
drop trigger if exists cap_records on public.records;
create trigger cap_records before insert on public.records for each row execute function public.enforce_cap();
drop function if exists public.set_prefs(text,text);

create or replace function public.set_auto_remind(v boolean) returns void language sql security definer set search_path=public as $$
  update public.profiles set auto_remind=v where id=auth.uid() and public.can_write() $$;

-- read-only client portal: anyone holding a valid, unexpired, not-turned-off link can read that one set of books
create or replace function public.portal_data(tok text) returns jsonb language plpgsql security definer set search_path=public as $$
declare l public.portal_links%rowtype; pr public.profiles%rowtype; cn text; br jsonb;
begin
  select * into l from public.portal_links where token=tok and not revoked and expires_at>now();
  if not found then return null; end if;
  select * into pr from public.profiles where id=l.user_id;
  if l.client_id is not null then select name into cn from public.clients where id=l.client_id; end if;
  select data into br from public.records where user_id=l.user_id and kind='m_brand' order by created_at desc limit 1;
  return jsonb_build_object('business',coalesce(pr.business,'Business'),'client',coalesce(cn,pr.business),'brand',coalesce(br,'{}'::jsonb),'country',pr.country,'label',l.label,
    'cash',(select coalesce(sum(case when type='in' then amount else -amount end),0) from public.entries where user_id=l.user_id and client_id is not distinct from l.client_id),
    'invoices',coalesce((select jsonb_agg(i) from (select number,client,issue_date,subtotal,tax,total,status from public.invoices where user_id=l.user_id and client_id is not distinct from l.client_id order by created_at desc limit 300) i),'[]'::jsonb),
    'entries',coalesce((select jsonb_agg(e) from (select entry_date,type,category,amount,note from public.entries where user_id=l.user_id and client_id is not distinct from l.client_id order by entry_date desc, created_at desc limit 1000) e),'[]'::jsonb));
end $$;

create or replace function public.portal_sign(tok text, nm text, nt text) returns boolean language plpgsql security definer set search_path=public as $$
declare lid uuid;
begin
  select id into lid from public.portal_links where token=tok and not revoked and expires_at>now();
  if lid is null or length(trim(coalesce(nm,'')))<2 then return false; end if;
  if (select count(*) from public.portal_signoffs where link_id=lid)>=20 then return false; end if;
  insert into public.portal_signoffs(link_id,name,note) values (lid,left(trim(nm),100),left(coalesce(nt,''),300));
  return true;
end $$;
grant execute on function public.portal_data(text), public.portal_sign(text,text,text) to anon, authenticated;

-- access rules: everyone sees only their own rows; nothing can be edited after the trial ends ------------------
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname='public' and tablename in ('profiles','clients','invoices','entries','budgets','records','portal_links','portal_signoffs') loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop; end $$;

create policy "profile read" on public.profiles for select using (id=auth.uid());
create policy "client read" on public.clients for select using (user_id=auth.uid());
create policy "client add" on public.clients for insert with check (user_id=auth.uid() and public.can_add_client());
create policy "client del" on public.clients for delete using (user_id=auth.uid());
create policy "inv read" on public.invoices for select using (user_id=auth.uid());
create policy "inv add" on public.invoices for insert with check (user_id=auth.uid() and public.can_write()
  and (client_id is null or exists(select 1 from public.clients c where c.id=client_id and c.user_id=auth.uid())));
create policy "inv del" on public.invoices for delete using (user_id=auth.uid());
create policy "ent read" on public.entries for select using (user_id=auth.uid());
create policy "ent add" on public.entries for insert with check (user_id=auth.uid() and public.can_write()
  and (client_id is null or exists(select 1 from public.clients c where c.id=client_id and c.user_id=auth.uid())));
create policy "ent del" on public.entries for delete using (user_id=auth.uid());
create policy "bud read" on public.budgets for select using (user_id=auth.uid());
create policy "bud add" on public.budgets for insert with check (user_id=auth.uid() and public.can_write()
  and (client_id is null or exists(select 1 from public.clients c where c.id=client_id and c.user_id=auth.uid())));
create policy "bud del" on public.budgets for delete using (user_id=auth.uid());
create policy "rec read" on public.records for select using (user_id=auth.uid());
create policy "rec add" on public.records for insert with check (user_id=auth.uid() and public.can_write()
  and (client_id is null or exists(select 1 from public.clients c where c.id=client_id and c.user_id=auth.uid())));
create policy "rec edit" on public.records for update using (user_id=auth.uid()) with check (user_id=auth.uid() and public.can_write());
create policy "rec del" on public.records for delete using (user_id=auth.uid());
create policy "pl read" on public.portal_links for select using (user_id=auth.uid());
create policy "pl add" on public.portal_links for insert with check (user_id=auth.uid() and public.can_write()
  and (select count(*) from public.portal_links x where x.user_id=auth.uid())<50
  and (client_id is null or exists(select 1 from public.clients c where c.id=client_id and c.user_id=auth.uid())));
create policy "pl edit" on public.portal_links for update using (user_id=auth.uid())
  with check (user_id=auth.uid() and (client_id is null or exists(select 1 from public.clients c where c.id=client_id and c.user_id=auth.uid())));
create policy "pl del" on public.portal_links for delete using (user_id=auth.uid());
create policy "so read" on public.portal_signoffs for select using (exists(select 1 from public.portal_links l where l.id=link_id and l.user_id=auth.uid()));

-- private file storage for the Documents vault (a failure here never breaks the rest) ------------------------
do $$ begin
  insert into storage.buckets (id, name, public) values ('docs', 'docs', false) on conflict (id) do nothing;
  drop policy if exists "docs read" on storage.objects;
  create policy "docs read" on storage.objects for select using (bucket_id='docs' and (storage.foldername(name))[1]=auth.uid()::text);
  drop policy if exists "docs insert" on storage.objects;
  drop policy if exists "docs write" on storage.objects;
  create policy "docs insert" on storage.objects for insert with check (bucket_id='docs' and (storage.foldername(name))[1]=auth.uid()::text and public.can_write());
  drop policy if exists "docs delete" on storage.objects;
  create policy "docs delete" on storage.objects for delete using (bucket_id='docs' and (storage.foldername(name))[1]=auth.uid()::text);
exception when others then raise notice 'Storage setup skipped: %', sqlerrm;
end $$;
