-- Verdiqt cloud MVP schema + RLS
-- Run in Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'client' check (role in ('client', 'lawyer', 'admin')),
  full_name text,
  trial_credits integer not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  jurisdiction text,
  incident_report text not null,
  status text not null default 'submitted'
    check (status in ('submitted', 'in_review', 'assigned', 'analyzed', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evidence_files (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'other' check (type in ('text', 'pdf', 'other')),
  storage_path text not null,
  sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.case_analyses (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  created_by text not null default 'system' check (created_by in ('system', 'lawyer', 'client')),
  report_markdown text not null,
  issues jsonb not null default '[]'::jsonb,
  outcomes jsonb not null default '[]'::jsonb,
  confidence numeric(5,2) not null default 0.0,
  created_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  lawyer_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id),
  status text not null default 'active' check (status in ('active', 'released', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(case_id, lawyer_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_role text not null check (recipient_role in ('client', 'lawyer', 'admin', 'all')),
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  lawyer_id uuid not null references public.profiles(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  case_id uuid references public.cases(id) on delete set null,
  channel text not null check (channel in ('chat', 'case_analysis', 'document_gen', 'evidence_analysis')),
  prompt_excerpt text,
  response_excerpt text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity text not null,
  entity_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, trial_credits)
  values (new.id, 'client', coalesce(new.raw_user_meta_data->>'full_name', ''), 5)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.evidence_files enable row level security;
alter table public.case_analyses enable row level security;
alter table public.assignments enable row level security;
alter table public.messages enable row level security;
alter table public.appointments enable row level security;
alter table public.ai_interactions enable row level security;
alter table public.audit_logs enable row level security;

-- Role check helper (security definer avoids RLS recursion on profiles)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
on public.profiles for update
using (auth.uid() = id);

drop policy if exists "profiles admin read all" on public.profiles;
create policy "profiles admin read all"
on public.profiles for select
using (public.is_admin());

drop policy if exists "cases owner full access" on public.cases;
create policy "cases owner full access"
on public.cases for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "cases lawyer read assigned" on public.cases;
create policy "cases lawyer read assigned"
on public.cases for select
using (exists (
  select 1 from public.assignments a
  where a.case_id = cases.id and a.lawyer_id = auth.uid() and a.status = 'active'
));

drop policy if exists "cases admin full access" on public.cases;
create policy "cases admin full access"
on public.cases for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "evidence owner or assigned lawyer read" on public.evidence_files;
create policy "evidence owner or assigned lawyer read"
on public.evidence_files for select
using (
  exists (select 1 from public.cases c where c.id = evidence_files.case_id and c.owner_id = auth.uid())
  or exists (select 1 from public.assignments a where a.case_id = evidence_files.case_id and a.lawyer_id = auth.uid() and a.status = 'active')
  or public.is_admin()
);

drop policy if exists "evidence owner insert" on public.evidence_files;
create policy "evidence owner insert"
on public.evidence_files for insert
with check (
  uploaded_by = auth.uid()
  and exists (select 1 from public.cases c where c.id = evidence_files.case_id and c.owner_id = auth.uid())
);

drop policy if exists "analysis case visibility" on public.case_analyses;
create policy "analysis case visibility"
on public.case_analyses for select
using (
  exists (select 1 from public.cases c where c.id = case_analyses.case_id and c.owner_id = auth.uid())
  or exists (select 1 from public.assignments a where a.case_id = case_analyses.case_id and a.lawyer_id = auth.uid() and a.status = 'active')
  or public.is_admin()
);

drop policy if exists "messages case visibility" on public.messages;
create policy "messages case visibility"
on public.messages for select
using (
  exists (select 1 from public.cases c where c.id = messages.case_id and c.owner_id = auth.uid())
  or exists (select 1 from public.assignments a where a.case_id = messages.case_id and a.lawyer_id = auth.uid() and a.status = 'active')
  or public.is_admin()
);

drop policy if exists "messages sender insert" on public.messages;
create policy "messages sender insert"
on public.messages for insert
with check (
  sender_id = auth.uid()
  and (
    exists (select 1 from public.cases c where c.id = messages.case_id and c.owner_id = auth.uid())
    or exists (select 1 from public.assignments a where a.case_id = messages.case_id and a.lawyer_id = auth.uid() and a.status = 'active')
    or public.is_admin()
  )
);

drop policy if exists "appointments case visibility" on public.appointments;
create policy "appointments case visibility"
on public.appointments for select
using (
  client_id = auth.uid()
  or lawyer_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "appointments client create" on public.appointments;
create policy "appointments client create"
on public.appointments for insert
with check (client_id = auth.uid());

drop policy if exists "assignments admin full" on public.assignments;
create policy "assignments admin full"
on public.assignments for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "assignments lawyer read" on public.assignments;
create policy "assignments lawyer read"
on public.assignments for select
using (lawyer_id = auth.uid());

drop policy if exists "ai_interactions admin read" on public.ai_interactions;
create policy "ai_interactions admin read"
on public.ai_interactions for select
using (public.is_admin());

drop policy if exists "audit_logs admin read" on public.audit_logs;
create policy "audit_logs admin read"
on public.audit_logs for select
using (public.is_admin());
