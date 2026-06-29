-- =============================================================================
-- Verdiqt — COMPLETE DATABASE RESET & INSTALL
-- =============================================================================
-- Run this ONCE in Supabase Dashboard → SQL Editor.
--
-- WARNING: Deletes ALL app data (cases, profiles, logs, etc.).
--           Auth users in auth.users are kept; profiles are recreated for them.
--
-- After running:
--   1. Restart frontend: cd frontend && npm run dev
--   2. Register a new account OR sign in with an existing one
--   3. Optional: disable email confirmation under Authentication → Providers → Email
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- TEARDOWN (safe order)
-- -----------------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists audit_cases on public.cases;

drop policy if exists "evidence upload by case owner" on storage.objects;
drop policy if exists "evidence read by authorized" on storage.objects;

drop table if exists public.audit_logs cascade;
drop table if exists public.ai_interactions cascade;
drop table if exists public.appointments cascade;
drop table if exists public.messages cascade;
drop table if exists public.case_analyses cascade;
drop table if exists public.evidence_files cascade;
drop table if exists public.assignments cascade;
drop table if exists public.cases cascade;
drop table if exists public.profiles cascade;

drop function if exists public.audit_case_changes() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.ensure_my_profile(text) cascade;
drop function if exists public.consume_trial_credit() cascade;
drop function if exists public.log_audit(text, text, text, jsonb) cascade;
drop function if exists public.save_case_analysis(uuid, text, jsonb, jsonb, numeric, text) cascade;
drop function if exists public.log_ai_interaction(text, text, text, uuid, jsonb) cascade;
drop function if exists public.admin_overview() cascade;
drop function if exists public.assign_lawyer_to_case(uuid, uuid) cascade;
drop function if exists public.is_admin() cascade;

-- -----------------------------------------------------------------------------
-- TABLES
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'client' check (role in ('client', 'lawyer', 'admin')),
  full_name text,
  email text,
  trial_credits integer not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cases (
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

create table public.evidence_files (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'other' check (type in ('text', 'pdf', 'other')),
  storage_path text not null,
  sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.case_analyses (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  created_by text not null default 'system' check (created_by in ('system', 'lawyer', 'client')),
  report_markdown text not null,
  issues jsonb not null default '[]'::jsonb,
  outcomes jsonb not null default '[]'::jsonb,
  confidence numeric(5,2) not null default 0.0,
  created_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  lawyer_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id),
  status text not null default 'active' check (status in ('active', 'released', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(case_id, lawyer_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_role text not null check (recipient_role in ('client', 'lawyer', 'admin', 'all')),
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.appointments (
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

create table public.ai_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  case_id uuid references public.cases(id) on delete set null,
  channel text not null check (channel in ('chat', 'case_analysis', 'document_gen', 'evidence_analysis')),
  prompt_excerpt text,
  response_excerpt text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity text not null,
  entity_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- HELPER FUNCTIONS (security definer — bypass RLS safely)
-- -----------------------------------------------------------------------------

-- Avoids infinite recursion: never query profiles inside a profiles RLS policy
create function public.is_admin()
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

create function public.ensure_my_profile(p_full_name text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  user_email text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select email into user_email from auth.users where id = uid;

  insert into public.profiles (id, role, full_name, email, trial_credits)
  values (uid, 'client', coalesce(p_full_name, ''), user_email, 5)
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    updated_at = now();
end;
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email, trial_credits)
  values (
    new.id,
    'client',
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    5
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create function public.consume_trial_credit()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  user_role text;
  remaining integer;
begin
  if uid is null then raise exception 'Not authenticated'; end if;

  select role, trial_credits into user_role, remaining from public.profiles where id = uid;
  if user_role is null then raise exception 'Profile not found'; end if;
  if user_role != 'client' then return -1; end if;
  if remaining <= 0 then raise exception 'Free trial credits exhausted'; end if;

  update public.profiles
  set trial_credits = trial_credits - 1, updated_at = now()
  where id = uid
  returning trial_credits into remaining;

  return remaining;
end;
$$;

create function public.log_audit(
  p_action text,
  p_entity text,
  p_entity_id text default null,
  p_meta jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  log_id uuid;
begin
  insert into public.audit_logs (actor_id, action, entity, entity_id, meta)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_meta, '{}'::jsonb))
  returning id into log_id;
  return log_id;
end;
$$;

create function public.save_case_analysis(
  p_case_id uuid,
  p_report_markdown text,
  p_issues jsonb default '[]'::jsonb,
  p_outcomes jsonb default '[]'::jsonb,
  p_confidence numeric default 0.62,
  p_created_by text default 'system'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  user_role text;
  analysis_id uuid;
  has_access boolean := false;
begin
  if uid is null then raise exception 'Not authenticated'; end if;

  select role into user_role from public.profiles where id = uid;

  select
    exists (select 1 from public.cases c where c.id = p_case_id and c.owner_id = uid)
    or exists (select 1 from public.assignments a where a.case_id = p_case_id and a.lawyer_id = uid and a.status = 'active')
    or user_role = 'admin'
  into has_access;

  if not has_access then raise exception 'Access denied'; end if;

  insert into public.case_analyses (case_id, created_by, report_markdown, issues, outcomes, confidence)
  values (p_case_id, p_created_by, p_report_markdown, p_issues, p_outcomes, p_confidence)
  returning id into analysis_id;

  update public.cases set status = 'analyzed', updated_at = now() where id = p_case_id;
  return analysis_id;
end;
$$;

create function public.log_ai_interaction(
  p_channel text,
  p_prompt text,
  p_response text,
  p_case_id uuid default null,
  p_meta jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  log_id uuid;
begin
  insert into public.ai_interactions (user_id, case_id, channel, prompt_excerpt, response_excerpt, meta)
  values (
    auth.uid(), p_case_id, p_channel,
    left(coalesce(p_prompt, ''), 8000),
    left(coalesce(p_response, ''), 8000),
    coalesce(p_meta, '{}'::jsonb)
  )
  returning id into log_id;
  return log_id;
end;
$$;

create function public.admin_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return jsonb_build_object(
    'users', (select count(*)::int from public.profiles),
    'cases', (select count(*)::int from public.cases),
    'ai_interactions_total', (select count(*)::int from public.ai_interactions),
    'ai_interactions_24h', (
      select count(*)::int from public.ai_interactions
      where created_at >= now() - interval '24 hours'
    )
  );
end;
$$;

create function public.assign_lawyer_to_case(p_case_id uuid, p_lawyer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  lawyer_role text;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;

  select role into lawyer_role from public.profiles where id = p_lawyer_id;
  if lawyer_role != 'lawyer' then raise exception 'Target user is not a lawyer'; end if;

  insert into public.assignments (case_id, lawyer_id, assigned_by, status)
  values (p_case_id, p_lawyer_id, auth.uid(), 'active')
  on conflict (case_id, lawyer_id) do update set
    status = 'active', assigned_by = auth.uid(), updated_at = now();

  update public.cases set status = 'assigned', updated_at = now() where id = p_case_id;
  perform public.log_audit('case_assign_lawyer', 'case', p_case_id::text, jsonb_build_object('lawyer_id', p_lawyer_id));
end;
$$;

create function public.audit_case_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (actor_id, action, entity, entity_id, meta)
    values (new.owner_id, 'case_create', 'case', new.id::text, jsonb_build_object('title', new.title));
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    insert into public.audit_logs (actor_id, action, entity, entity_id, meta)
    values (auth.uid(), 'case_status_update', 'case', new.id::text, jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return coalesce(new, old);
end;
$$;

create trigger audit_cases
  after insert or update on public.cases
  for each row execute procedure public.audit_case_changes();

-- Grant execute on RPCs
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.ensure_my_profile(text) from public;
grant execute on function public.ensure_my_profile(text) to authenticated;
revoke all on function public.consume_trial_credit() from public;
grant execute on function public.consume_trial_credit() to authenticated;
revoke all on function public.log_audit(text, text, text, jsonb) from public;
grant execute on function public.log_audit(text, text, text, jsonb) to authenticated;
revoke all on function public.save_case_analysis(uuid, text, jsonb, jsonb, numeric, text) from public;
grant execute on function public.save_case_analysis(uuid, text, jsonb, jsonb, numeric, text) to authenticated;
revoke all on function public.log_ai_interaction(text, text, text, uuid, jsonb) from public;
grant execute on function public.log_ai_interaction(text, text, text, uuid, jsonb) to authenticated;
revoke all on function public.admin_overview() from public;
grant execute on function public.admin_overview() to authenticated;
revoke all on function public.assign_lawyer_to_case(uuid, uuid) from public;
grant execute on function public.assign_lawyer_to_case(uuid, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.evidence_files enable row level security;
alter table public.case_analyses enable row level security;
alter table public.assignments enable row level security;
alter table public.messages enable row level security;
alter table public.appointments enable row level security;
alter table public.ai_interactions enable row level security;
alter table public.audit_logs enable row level security;

-- profiles
create policy "profiles self read" on public.profiles for select using (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);
create policy "profiles admin read all" on public.profiles for select using (public.is_admin());
create policy "profiles admin update" on public.profiles for update using (public.is_admin());

-- cases
create policy "cases owner full access" on public.cases for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "cases lawyer read assigned" on public.cases for select
  using (exists (
    select 1 from public.assignments a
    where a.case_id = cases.id and a.lawyer_id = auth.uid() and a.status = 'active'
  ));

create policy "cases admin full access" on public.cases for all
  using (public.is_admin()) with check (public.is_admin());

-- evidence
create policy "evidence owner or assigned lawyer read" on public.evidence_files for select
  using (
    exists (select 1 from public.cases c where c.id = evidence_files.case_id and c.owner_id = auth.uid())
    or exists (select 1 from public.assignments a where a.case_id = evidence_files.case_id and a.lawyer_id = auth.uid() and a.status = 'active')
    or public.is_admin()
  );

create policy "evidence owner insert" on public.evidence_files for insert
  with check (
    uploaded_by = auth.uid()
    and exists (select 1 from public.cases c where c.id = evidence_files.case_id and c.owner_id = auth.uid())
  );

-- analyses
create policy "analysis case visibility" on public.case_analyses for select
  using (
    exists (select 1 from public.cases c where c.id = case_analyses.case_id and c.owner_id = auth.uid())
    or exists (select 1 from public.assignments a where a.case_id = case_analyses.case_id and a.lawyer_id = auth.uid() and a.status = 'active')
    or public.is_admin()
  );

-- messages
create policy "messages case visibility" on public.messages for select
  using (
    exists (select 1 from public.cases c where c.id = messages.case_id and c.owner_id = auth.uid())
    or exists (select 1 from public.assignments a where a.case_id = messages.case_id and a.lawyer_id = auth.uid() and a.status = 'active')
    or public.is_admin()
  );

create policy "messages sender insert" on public.messages for insert
  with check (
    sender_id = auth.uid()
    and (
      exists (select 1 from public.cases c where c.id = messages.case_id and c.owner_id = auth.uid())
      or exists (select 1 from public.assignments a where a.case_id = messages.case_id and a.lawyer_id = auth.uid() and a.status = 'active')
      or public.is_admin()
    )
  );

-- appointments
create policy "appointments case visibility" on public.appointments for select
  using (client_id = auth.uid() or lawyer_id = auth.uid() or public.is_admin());

create policy "appointments client create" on public.appointments for insert
  with check (client_id = auth.uid());

create policy "appointments participant update" on public.appointments for update
  using (client_id = auth.uid() or lawyer_id = auth.uid() or public.is_admin());

-- assignments
create policy "assignments admin full" on public.assignments for all
  using (public.is_admin()) with check (public.is_admin());

create policy "assignments lawyer read" on public.assignments for select
  using (lawyer_id = auth.uid());

-- logs
create policy "ai_interactions admin read" on public.ai_interactions for select
  using (public.is_admin());

create policy "audit_logs admin read" on public.audit_logs for select
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- BACKFILL profiles for existing auth users
-- -----------------------------------------------------------------------------

insert into public.profiles (id, role, full_name, email, trial_credits)
select u.id, 'client', coalesce(u.raw_user_meta_data->>'full_name', ''), u.email, 5
from auth.users u
on conflict (id) do update set
  email = excluded.email,
  full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name);

-- -----------------------------------------------------------------------------
-- STORAGE (evidence bucket)
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

create policy "evidence upload by case owner" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'evidence'
    and exists (
      select 1 from public.cases c
      where c.id::text = (storage.foldername(name))[1]
      and c.owner_id = auth.uid()
    )
  );

create policy "evidence read by authorized" on storage.objects for select to authenticated
  using (
    bucket_id = 'evidence'
    and (
      exists (
        select 1 from public.cases c
        where c.id::text = (storage.foldername(name))[1]
        and c.owner_id = auth.uid()
      )
      or exists (
        select 1 from public.assignments a
        where a.case_id::text = (storage.foldername(name))[1]
        and a.lawyer_id = auth.uid()
        and a.status = 'active'
      )
      or public.is_admin()
    )
  );

-- -----------------------------------------------------------------------------
-- REALTIME (ignore errors if tables already in publication)
-- -----------------------------------------------------------------------------

do $$ begin alter publication supabase_realtime add table public.cases; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.case_analyses; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.messages; exception when others then null; end $$;

-- Done.
select 'Verdiqt schema installed successfully.' as status;
