-- Fix: infinite recursion on profiles RLS
-- ONLY run this if you already ran 001 and 002. Do NOT re-run 001.
-- Safe to run multiple times (drops and recreates affected policies).

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

-- profiles
drop policy if exists "profiles admin read all" on public.profiles;
create policy "profiles admin read all"
on public.profiles for select
using (public.is_admin());

drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update"
on public.profiles for update
using (public.is_admin());

-- cases
drop policy if exists "cases admin full access" on public.cases;
create policy "cases admin full access"
on public.cases for all
using (public.is_admin())
with check (public.is_admin());

-- evidence_files
drop policy if exists "evidence owner or assigned lawyer read" on public.evidence_files;
create policy "evidence owner or assigned lawyer read"
on public.evidence_files for select
using (
  exists (select 1 from public.cases c where c.id = evidence_files.case_id and c.owner_id = auth.uid())
  or exists (select 1 from public.assignments a where a.case_id = evidence_files.case_id and a.lawyer_id = auth.uid() and a.status = 'active')
  or public.is_admin()
);

-- case_analyses
drop policy if exists "analysis case visibility" on public.case_analyses;
create policy "analysis case visibility"
on public.case_analyses for select
using (
  exists (select 1 from public.cases c where c.id = case_analyses.case_id and c.owner_id = auth.uid())
  or exists (select 1 from public.assignments a where a.case_id = case_analyses.case_id and a.lawyer_id = auth.uid() and a.status = 'active')
  or public.is_admin()
);

-- messages
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

-- appointments
drop policy if exists "appointments case visibility" on public.appointments;
create policy "appointments case visibility"
on public.appointments for select
using (
  client_id = auth.uid()
  or lawyer_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "appointments participant update" on public.appointments;
create policy "appointments participant update"
on public.appointments for update
using (
  client_id = auth.uid()
  or lawyer_id = auth.uid()
  or public.is_admin()
);

-- assignments
drop policy if exists "assignments admin full" on public.assignments;
create policy "assignments admin full"
on public.assignments for all
using (public.is_admin())
with check (public.is_admin());

-- ai_interactions
drop policy if exists "ai_interactions admin read" on public.ai_interactions;
create policy "ai_interactions admin read"
on public.ai_interactions for select
using (public.is_admin());

-- audit_logs
drop policy if exists "audit_logs admin read" on public.audit_logs;
create policy "audit_logs admin read"
on public.audit_logs for select
using (public.is_admin());

-- storage (from 002)
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
