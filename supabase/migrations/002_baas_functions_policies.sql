-- Verdiqt: Supabase BaaS layer (replaces custom Python backend)
-- Run after 001_cloud_mvp_schema.sql

-- Sync email from auth.users into profiles for admin UI
alter table public.profiles add column if not exists email text;

create or replace function public.handle_new_user()
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

-- Backfill emails for existing profiles
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and (p.email is null or p.email = '');

-- Admin can update any profile (role management)
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update"
on public.profiles for update
using (public.is_admin());

-- Appointments: participants can update status/notes
drop policy if exists "appointments participant update" on public.appointments;
create policy "appointments participant update"
on public.appointments for update
using (
  client_id = auth.uid()
  or lawyer_id = auth.uid()
  or public.is_admin()
);

-- Trial credit consumption (clients only)
create or replace function public.consume_trial_credit()
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
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select role, trial_credits into user_role, remaining
  from public.profiles where id = uid;

  if user_role is null then
    raise exception 'Profile not found';
  end if;

  if user_role != 'client' then
    return -1;
  end if;

  if remaining <= 0 then
    raise exception 'Free trial credits exhausted';
  end if;

  update public.profiles
  set trial_credits = trial_credits - 1, updated_at = now()
  where id = uid
  returning trial_credits into remaining;

  return remaining;
end;
$$;

revoke all on function public.consume_trial_credit() from public;
grant execute on function public.consume_trial_credit() to authenticated;

-- Audit log helper (callable by authenticated users for their own actions)
create or replace function public.log_audit(
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

revoke all on function public.log_audit(text, text, text, jsonb) from public;
grant execute on function public.log_audit(text, text, text, jsonb) to authenticated;

-- Save case analysis (validates case access, updates case status)
create or replace function public.save_case_analysis(
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

  select exists (
    select 1 from public.cases c where c.id = p_case_id and c.owner_id = uid
  ) or exists (
    select 1 from public.assignments a
    where a.case_id = p_case_id and a.lawyer_id = uid and a.status = 'active'
  ) or user_role = 'admin'
  into has_access;

  if not has_access then
    raise exception 'Access denied';
  end if;

  insert into public.case_analyses (case_id, created_by, report_markdown, issues, outcomes, confidence)
  values (p_case_id, p_created_by, p_report_markdown, p_issues, p_outcomes, p_confidence)
  returning id into analysis_id;

  update public.cases set status = 'analyzed', updated_at = now() where id = p_case_id;

  return analysis_id;
end;
$$;

revoke all on function public.save_case_analysis(uuid, text, jsonb, jsonb, numeric, text) from public;
grant execute on function public.save_case_analysis(uuid, text, jsonb, jsonb, numeric, text) to authenticated;

-- Log AI interaction
create or replace function public.log_ai_interaction(
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
    auth.uid(),
    p_case_id,
    p_channel,
    left(coalesce(p_prompt, ''), 8000),
    left(coalesce(p_response, ''), 8000),
    coalesce(p_meta, '{}'::jsonb)
  )
  returning id into log_id;
  return log_id;
end;
$$;

revoke all on function public.log_ai_interaction(text, text, text, uuid, jsonb) from public;
grant execute on function public.log_ai_interaction(text, text, text, uuid, jsonb) to authenticated;

-- Admin overview stats
create or replace function public.admin_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

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

revoke all on function public.admin_overview() from public;
grant execute on function public.admin_overview() to authenticated;

-- Assign lawyer to case (admin only)
create or replace function public.assign_lawyer_to_case(
  p_case_id uuid,
  p_lawyer_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  lawyer_role text;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select role into lawyer_role from public.profiles where id = p_lawyer_id;
  if lawyer_role != 'lawyer' then
    raise exception 'Target user is not a lawyer';
  end if;

  insert into public.assignments (case_id, lawyer_id, assigned_by, status)
  values (p_case_id, p_lawyer_id, auth.uid(), 'active')
  on conflict (case_id, lawyer_id) do update set
    status = 'active',
    assigned_by = auth.uid(),
    updated_at = now();

  update public.cases set status = 'assigned', updated_at = now() where id = p_case_id;

  perform public.log_audit('case_assign_lawyer', 'case', p_case_id::text, jsonb_build_object('lawyer_id', p_lawyer_id));
end;
$$;

revoke all on function public.assign_lawyer_to_case(uuid, uuid) from public;
grant execute on function public.assign_lawyer_to_case(uuid, uuid) to authenticated;

-- Auto-audit triggers for key tables
create or replace function public.audit_case_changes()
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

drop trigger if exists audit_cases on public.cases;
create trigger audit_cases
  after insert or update on public.cases
  for each row execute procedure public.audit_case_changes();

-- Enable Realtime for live case and analysis updates
alter publication supabase_realtime add table public.cases;
alter publication supabase_realtime add table public.case_analyses;
alter publication supabase_realtime add table public.messages;

-- Storage bucket for evidence (create via dashboard or here)
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

-- Storage RLS: case owners upload; owners/lawyers/admins read
drop policy if exists "evidence upload by case owner" on storage.objects;
create policy "evidence upload by case owner"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'evidence'
  and exists (
    select 1 from public.cases c
    where c.id::text = (storage.foldername(name))[1]
    and c.owner_id = auth.uid()
  )
);

drop policy if exists "evidence read by authorized" on storage.objects;
create policy "evidence read by authorized"
on storage.objects for select
to authenticated
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
