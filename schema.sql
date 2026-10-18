-- Run once in Supabase SQL editor. Also: Auth > Providers > Email enabled.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, name text, business text, country text, plan text,
  problems jsonb default '[]',
  status text not null default 'trial',            -- trial | active | cancelled
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  number text, client text, issue_date date, items jsonb, tax_rate numeric default 0,
  subtotal numeric, tax numeric, total numeric, status text default 'unpaid',
  created_at timestamptz default now()
);
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  entry_date date, type text check (type in ('in','out')), category text,
  amount numeric not null, note text, invoice_id uuid,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
alter table public.invoices enable row level security;
alter table public.entries  enable row level security;
create policy "own profile read"  on public.profiles for select using (id = auth.uid());
-- no update policy on profiles: status is changed only by the webhook (service key)
create or replace function public.can_write() returns boolean language sql security definer stable set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and (status='active' or trial_ends_at>now())) $$;
drop policy if exists "inv read" on public.invoices;
create policy "inv read" on public.invoices for select using (user_id=auth.uid());
drop policy if exists "inv write" on public.invoices;
create policy "inv write" on public.invoices for insert with check (user_id=auth.uid() and public.can_write());
drop policy if exists "inv edit" on public.invoices;
create policy "inv edit" on public.invoices for update using (user_id=auth.uid());
drop policy if exists "inv del" on public.invoices;
create policy "inv del" on public.invoices for delete using (user_id=auth.uid());
drop policy if exists "ent read" on public.entries;
create policy "ent read" on public.entries for select using (user_id=auth.uid());
drop policy if exists "ent write" on public.entries;
create policy "ent write" on public.entries for insert with check (user_id=auth.uid() and public.can_write());
drop policy if exists "ent edit" on public.entries;
create policy "ent edit" on public.entries for update using (user_id=auth.uid());
drop policy if exists "ent del" on public.entries;
create policy "ent del" on public.entries for delete using (user_id=auth.uid());
-- lets Google sign-ups store country/plan once, without ever touching status
create or replace function public.set_prefs(c text,p text) returns void language sql security definer set search_path=public as $$
  update public.profiles set country=left(c,4), plan=coalesce(plan,left(p,20)) where id=auth.uid() and country is null $$;

create or replace function public.new_profile() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,email,name,business,country,plan,problems)
  values (new.id,new.email,new.raw_user_meta_data->>'name',new.raw_user_meta_data->>'business',
          new.raw_user_meta_data->>'country',new.raw_user_meta_data->>'plan',
          coalesce(new.raw_user_meta_data->'problems','[]'::jsonb));
  return new;
end $$;
drop trigger if exists on_signup on auth.users;
create trigger on_signup after insert on auth.users for each row execute function public.new_profile();

-- ===== v3: onboarding after signup + Firm (multi-client) mode =====
alter table public.profiles add column if not exists onboarded boolean not null default false;
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null, created_at timestamptz default now());
alter table public.invoices add column if not exists client_id uuid references public.clients(id) on delete cascade;
alter table public.entries  add column if not exists client_id uuid references public.clients(id) on delete cascade;
alter table public.clients enable row level security;
create or replace function public.can_add_client() returns boolean language sql security definer stable set search_path=public as $$
  select public.can_write()
    and exists(select 1 from public.profiles where id=auth.uid() and plan='Firm')
    and (select count(*) from public.clients where user_id=auth.uid())<50 $$;
drop policy if exists "cl read" on public.clients;  create policy "cl read" on public.clients for select using (user_id=auth.uid());
drop policy if exists "cl add" on public.clients;   create policy "cl add" on public.clients for insert with check (user_id=auth.uid() and public.can_add_client());
drop policy if exists "cl edit" on public.clients;  create policy "cl edit" on public.clients for update using (user_id=auth.uid());
drop policy if exists "cl del" on public.clients;   create policy "cl del" on public.clients for delete using (user_id=auth.uid());
drop policy if exists "inv write" on public.invoices;
create policy "inv write" on public.invoices for insert with check (user_id=auth.uid() and public.can_write()
  and (client_id is null or exists(select 1 from public.clients c where c.id=client_id and c.user_id=auth.uid())));
drop policy if exists "ent write" on public.entries;
create policy "ent write" on public.entries for insert with check (user_id=auth.uid() and public.can_write()
  and (client_id is null or exists(select 1 from public.clients c where c.id=client_id and c.user_id=auth.uid())));
create or replace function public.complete_onboarding(nm text,bz text,c text,p text,pb jsonb) returns void language sql security definer set search_path=public as $$
  update public.profiles set name=left(nm,100), business=left(bz,150), country=left(c,4),
    plan=case when p in ('Starter','Growth','Firm') then p else 'Growth' end,
    problems=coalesce(pb,'[]'::jsonb), onboarded=true
  where id=auth.uid() and onboarded=false $$;
