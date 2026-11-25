-- Run in Supabase > SQL Editor. Safe to run again. Adds/updates ONE table (enquiries). Existing app tables and data are untouched.
create table if not exists public.enquiries(
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 kind text not null,
 name text not null check (char_length(name) between 1 and 120),
 email text not null check (char_length(email) between 5 and 200),
 phone text check (phone is null or char_length(phone)<=40),
 organisation text check (organisation is null or char_length(organisation)<=200),
 businesses int check (businesses is null or businesses between 1 and 1000000),
 message text check (message is null or char_length(message)<=3000),
 status text not null default 'new'
);
-- enquiry details from the contact form
alter table public.enquiries add column if not exists current_software text check (current_software is null or char_length(current_software)<=200);
alter table public.enquiries add column if not exists plan_interest text;
-- your pipeline columns (you fill these in Table Editor; visitors cannot)
alter table public.enquiries add column if not exists follow_up_on date;
alter table public.enquiries add column if not exists proposal_sent_on date;
alter table public.enquiries add column if not exists pilot_start_on date;
alter table public.enquiries add column if not exists annual_start_on date;
alter table public.enquiries add column if not exists amount_inr numeric;
alter table public.enquiries add column if not exists payment_status text not null default 'none';
alter table public.enquiries add column if not exists onboarding_status text not null default 'none';
alter table public.enquiries add column if not exists notes text;
alter table public.enquiries drop constraint if exists enquiries_kind_check;
alter table public.enquiries add constraint enquiries_kind_check check (kind in ('general','demo','pilot','accountant','bulk','government','partner'));
alter table public.enquiries drop constraint if exists enquiries_plan_check;
alter table public.enquiries add constraint enquiries_plan_check check (plan_interest is null or plan_interest in ('not_sure','pilot','accountant_pack','business','personal','bulk'));
alter table public.enquiries drop constraint if exists enquiries_status_check;
alter table public.enquiries add constraint enquiries_status_check check (status in ('new','contacted','demo','proposal','pilot','won','lost'));
alter table public.enquiries enable row level security;
drop policy if exists "anyone can send an enquiry" on public.enquiries;
create policy "anyone can send an enquiry" on public.enquiries for insert to anon, authenticated
 with check (status='new' and notes is null and amount_inr is null and follow_up_on is null and proposal_sent_on is null and pilot_start_on is null and annual_start_on is null and payment_status='none' and onboarding_status='none');
-- No select/update policy on purpose: visitors cannot read or change enquiries. You manage them in Supabase > Table Editor.
-- Suggested use: filter by status, sort by follow_up_on. payment_status: none, invoiced, paid. onboarding_status: none, scheduled, done.
