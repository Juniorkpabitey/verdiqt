-- Verdiqt v2: Criminal Justice Intelligence Platform (Phases 1-4)
-- Run AFTER schema_complete_reset.sql (additive — safe on existing DB)

-- Extend profile roles
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('client', 'lawyer', 'admin', 'hr_monitor', 'researcher', 'legal_aid'));

alter table public.profiles add column if not exists organization_id uuid;
alter table public.profiles add column if not exists preferred_language text not null default 'en';

-- Extend cases
alter table public.cases add column if not exists procedural_stage text
  check (procedural_stage is null or procedural_stage in (
    'arrest', 'investigation', 'charge', 'bail', 'trial', 'appeal', 'closed'
  ));
alter table public.cases add column if not exists jurisdiction_pack_id uuid;
alter table public.cases add column if not exists country_code text;

-- Organizations (Phase 2/4)
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('legal_aid', 'public_defender', 'law_firm', 'ngo', 'court_pilot')),
  country_code text,
  created_at timestamptz not null default now()
);

do $$ begin
  alter table public.profiles
    add constraint profiles_organization_id_fkey
    foreign key (organization_id) references public.organizations(id);
exception when duplicate_object then null;
end $$;

-- Jurisdiction packs (Phase 3)
create table if not exists public.jurisdiction_packs (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,
  name text not null,
  version text not null default '1.0',
  content jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

do $$ begin
  alter table public.cases
    add constraint cases_jurisdiction_pack_id_fkey
    foreign key (jurisdiction_pack_id) references public.jurisdiction_packs(id);
exception when duplicate_object then null;
end $$;

-- Case intelligence
create table if not exists public.case_timeline_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  event_date timestamptz,
  event_date_precision text default 'day',
  title text not null,
  description text,
  actors jsonb not null default '[]'::jsonb,
  source_document_id uuid references public.evidence_files(id) on delete set null,
  ai_generated boolean not null default false,
  lawyer_verified boolean not null default false,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.case_entities (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  entity_type text not null check (entity_type in (
    'person', 'location', 'charge', 'statute', 'object', 'event', 'other'
  )),
  label text not null,
  attributes jsonb not null default '{}'::jsonb,
  source_refs jsonb not null default '[]'::jsonb,
  ai_generated boolean not null default false,
  lawyer_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.witness_statements (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  witness_label text not null,
  statement_text text not null,
  evidence_file_id uuid references public.evidence_files(id) on delete set null,
  ai_summary text,
  ai_generated boolean not null default false,
  lawyer_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.contradiction_flags (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  source_a_type text not null,
  source_a_id uuid not null,
  source_b_type text not null,
  source_b_id uuid not null,
  description text not null,
  ai_confidence numeric(5,2),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed', 'material')),
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Human rights (Phase 1)
create table if not exists public.rights_assessments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  assessment_type text not null check (assessment_type in (
    'fair_trial', 'due_process', 'procedural_fairness'
  )),
  checklist_responses jsonb not null default '{}'::jsonb,
  ai_summary text,
  risk_alerts jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'approved')),
  created_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Evidence custody (Phase 1)
create table if not exists public.evidence_custody_log (
  id uuid primary key default gen_random_uuid(),
  evidence_file_id uuid not null references public.evidence_files(id) on delete cascade,
  action text not null check (action in (
    'uploaded', 'accessed', 'transferred', 'exported', 'hash_verified'
  )),
  actor_id uuid references public.profiles(id),
  notes text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- HITL AI reviews (Phase 1)
create table if not exists public.ai_reviews (
  id uuid primary key default gen_random_uuid(),
  ai_interaction_id uuid references public.ai_interactions(id) on delete set null,
  case_id uuid references public.cases(id) on delete cascade,
  output_type text not null,
  ai_draft jsonb not null,
  human_edited jsonb,
  confidence numeric(5,2),
  status text not null default 'draft'
    check (status in ('draft', 'reviewed', 'approved', 'rejected', 'shared_with_client')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  contestability_hash text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Governance registry (Phase 1/2)
create table if not exists public.ai_model_registry (
  id uuid primary key default gen_random_uuid(),
  model_key text not null unique,
  provider text not null,
  version text not null,
  intended_use text not null,
  prohibited_uses text not null,
  limitations text,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  active boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.prompt_registry (
  id uuid primary key default gen_random_uuid(),
  task_key text not null,
  version text not null,
  template text not null,
  output_schema jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(task_key, version)
);

create table if not exists public.governance_incidents (
  id uuid primary key default gen_random_uuid(),
  incident_type text not null check (incident_type in (
    'bias', 'error', 'misuse', 'transparency', 'other'
  )),
  severity text not null check (severity in ('low', 'medium', 'high')),
  description text not null,
  case_id uuid references public.cases(id) on delete set null,
  ai_interaction_id uuid references public.ai_interactions(id) on delete set null,
  status text not null default 'open',
  reported_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- Procedure pathways (Phase 3)
create table if not exists public.procedure_pathways (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  stage text not null,
  responses jsonb not null default '{}'::jsonb,
  completed_steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- API integrations stub (Phase 4)
create table if not exists public.integration_endpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  endpoint_type text not null check (endpoint_type in ('case_export', 'filing_prep', 'webhook')),
  config jsonb not null default '{}'::jsonb,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

-- Helper roles
create or replace function public.is_hr_monitor()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce(
    (select role in ('hr_monitor', 'admin') from public.profiles where id = auth.uid()), false
  );
$$;

create or replace function public.is_researcher()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce(
    (select role in ('researcher', 'admin') from public.profiles where id = auth.uid()), false
  );
$$;

create or replace function public.is_legal_professional()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce(
    (select role in ('lawyer', 'admin', 'legal_aid') from public.profiles where id = auth.uid()), false
  );
$$;

grant execute on function public.is_hr_monitor() to authenticated;
grant execute on function public.is_researcher() to authenticated;
grant execute on function public.is_legal_professional() to authenticated;

-- Case access helper (security definer)
create or replace function public.user_can_access_case(p_case_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r text;
begin
  if uid is null then return false; end if;
  select role into r from public.profiles where id = uid;
  if r = 'admin' then return true; end if;
  if exists (select 1 from public.cases c where c.id = p_case_id and c.owner_id = uid) then return true; end if;
  if exists (
    select 1 from public.assignments a
    where a.case_id = p_case_id and a.lawyer_id = uid and a.status = 'active'
  ) then return true; end if;
  return false;
end;
$$;

grant execute on function public.user_can_access_case(uuid) to authenticated;

-- RPC: create AI review draft
create or replace function public.create_ai_review(
  p_case_id uuid,
  p_output_type text,
  p_ai_draft jsonb,
  p_confidence numeric default null,
  p_ai_interaction_id uuid default null,
  p_meta jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  if not public.user_can_access_case(p_case_id) then
    raise exception 'Access denied';
  end if;
  insert into public.ai_reviews (
    case_id, output_type, ai_draft, confidence, ai_interaction_id, meta, status
  ) values (
    p_case_id, p_output_type, p_ai_draft, p_confidence, p_ai_interaction_id, coalesce(p_meta, '{}'::jsonb), 'draft'
  ) returning id into rid;
  return rid;
end;
$$;

grant execute on function public.create_ai_review(uuid, text, jsonb, numeric, uuid, jsonb) to authenticated;

-- RPC: update review status (HITL)
create or replace function public.update_ai_review_status(
  p_review_id uuid,
  p_status text,
  p_human_edited jsonb default null,
  p_rejection_reason text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select case_id into cid from public.ai_reviews where id = p_review_id;
  if cid is null then raise exception 'Review not found'; end if;
  if not public.user_can_access_case(cid) and not public.is_admin() then
    raise exception 'Access denied';
  end if;
  if p_status = 'shared_with_client' and not public.is_legal_professional() then
    raise exception 'Only legal professionals may share with clients';
  end if;
  update public.ai_reviews set
    status = p_status,
    human_edited = coalesce(p_human_edited, human_edited),
    rejection_reason = p_rejection_reason,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = p_review_id;
  perform public.log_audit('ai_review_' || p_status, 'ai_review', p_review_id::text);
end;
$$;

grant execute on function public.update_ai_review_status(uuid, text, jsonb, text) to authenticated;

-- RPC: log custody event
create or replace function public.log_evidence_custody(
  p_evidence_file_id uuid,
  p_action text,
  p_notes text default null,
  p_meta jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path = public as $$
declare lid uuid; cid uuid;
begin
  select case_id into cid from public.evidence_files where id = p_evidence_file_id;
  if not public.user_can_access_case(cid) then raise exception 'Access denied'; end if;
  insert into public.evidence_custody_log (evidence_file_id, action, actor_id, notes, meta)
  values (p_evidence_file_id, p_action, auth.uid(), p_notes, coalesce(p_meta, '{}'::jsonb))
  returning id into lid;
  return lid;
end;
$$;

grant execute on function public.log_evidence_custody(uuid, text, text, jsonb) to authenticated;

-- RLS enable
alter table public.organizations enable row level security;
alter table public.jurisdiction_packs enable row level security;
alter table public.case_timeline_events enable row level security;
alter table public.case_entities enable row level security;
alter table public.witness_statements enable row level security;
alter table public.contradiction_flags enable row level security;
alter table public.rights_assessments enable row level security;
alter table public.evidence_custody_log enable row level security;
alter table public.ai_reviews enable row level security;
alter table public.ai_model_registry enable row level security;
alter table public.prompt_registry enable row level security;
alter table public.governance_incidents enable row level security;
alter table public.procedure_pathways enable row level security;
alter table public.integration_endpoints enable row level security;

-- Policies: jurisdiction packs readable by all authenticated
drop policy if exists "jurisdiction packs read" on public.jurisdiction_packs;
create policy "jurisdiction packs read" on public.jurisdiction_packs for select to authenticated using (active = true);

-- Case-linked tables
drop policy if exists "timeline case access" on public.case_timeline_events;
create policy "timeline case access" on public.case_timeline_events for all
  using (public.user_can_access_case(case_id) or public.is_admin())
  with check (public.user_can_access_case(case_id) or public.is_admin());

drop policy if exists "entities case access" on public.case_entities;
create policy "entities case access" on public.case_entities for all
  using (public.user_can_access_case(case_id) or public.is_admin())
  with check (public.user_can_access_case(case_id) or public.is_admin());

drop policy if exists "witness case access" on public.witness_statements;
create policy "witness case access" on public.witness_statements for all
  using (public.user_can_access_case(case_id) or public.is_admin())
  with check (public.user_can_access_case(case_id) or public.is_admin());

drop policy if exists "contradiction case access" on public.contradiction_flags;
create policy "contradiction case access" on public.contradiction_flags for all
  using (public.user_can_access_case(case_id) or public.is_admin())
  with check (public.user_can_access_case(case_id) or public.is_admin());

drop policy if exists "rights case access" on public.rights_assessments;
create policy "rights case access" on public.rights_assessments for all
  using (public.user_can_access_case(case_id) or public.is_admin())
  with check (public.user_can_access_case(case_id) or public.is_admin());

drop policy if exists "custody case access" on public.evidence_custody_log;
create policy "custody case access" on public.evidence_custody_log for select
  using (exists (
    select 1 from public.evidence_files ef
    where ef.id = evidence_custody_log.evidence_file_id
    and (public.user_can_access_case(ef.case_id) or public.is_admin())
  ));

drop policy if exists "ai reviews case access" on public.ai_reviews;
create policy "ai reviews case access" on public.ai_reviews for all
  using (case_id is null or public.user_can_access_case(case_id) or public.is_admin())
  with check (case_id is null or public.user_can_access_case(case_id) or public.is_admin());

drop policy if exists "pathways self" on public.procedure_pathways;
create policy "pathways self" on public.procedure_pathways for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "governance registry admin" on public.ai_model_registry;
create policy "governance registry admin read" on public.ai_model_registry for select
  using (public.is_admin() or public.is_hr_monitor() or public.is_researcher());
drop policy if exists "governance registry admin write" on public.ai_model_registry;
create policy "governance registry admin write" on public.ai_model_registry for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "prompt registry read" on public.prompt_registry;
create policy "prompt registry read" on public.prompt_registry for select
  using (public.is_admin() or public.is_hr_monitor() or public.is_researcher());

drop policy if exists "governance incidents" on public.governance_incidents;
create policy "governance incidents read" on public.governance_incidents for select
  using (public.is_admin() or public.is_hr_monitor() or reported_by = auth.uid());
drop policy if exists "governance incidents write" on public.governance_incidents;
create policy "governance incidents write" on public.governance_incidents for insert
  with check (auth.uid() is not null);
drop policy if exists "governance incidents admin update" on public.governance_incidents;
create policy "governance incidents admin update" on public.governance_incidents for update
  using (public.is_admin());

drop policy if exists "organizations read" on public.organizations;
create policy "organizations read" on public.organizations for select to authenticated using (true);

drop policy if exists "integrations admin" on public.integration_endpoints;
create policy "integrations admin" on public.integration_endpoints for all
  using (public.is_admin()) with check (public.is_admin());

-- Seed jurisdiction packs (Phase 3)
insert into public.jurisdiction_packs (country_code, name, version, content) values
('GH', 'Ghana Criminal Procedure Pack', '1.0', '{"stages":["arrest","bail","trial"],"rights":["Right to counsel","Presumption of innocence"],"resources":["Legal Aid Scheme"]}'::jsonb),
('NG', 'Nigeria Criminal Procedure Pack', '1.0', '{"stages":["arrest","charge","bail","trial"],"rights":["Constitution s36 fair hearing"],"resources":["Legal Aid Council"]}'::jsonb),
('KE', 'Kenya Criminal Procedure Pack', '1.0', '{"stages":["arrest","investigation","bail","trial"],"rights":["Constitution Art. 50"],"resources":["Nairobi Legal Aid"]}'::jsonb),
('TZ', 'Tanzania Criminal Procedure Pack', '1.0', '{"stages":["arrest","investigation","trial"],"rights":["Fair trial principles"],"resources":["Legal Services Facility"]}'::jsonb),
('ZA', 'South Africa Criminal Procedure Pack', '1.0', '{"stages":["arrest","bail","trial","appeal"],"rights":["Bill of Rights s35"],"resources":["Legal Aid SA"]}'::jsonb)
on conflict do nothing;

-- Seed model registry
insert into public.ai_model_registry (model_key, provider, version, intended_use, prohibited_uses, limitations, active)
values (
  'verdiqt-default',
  'openai',
  '1.0',
  'Legal research, case summarization, document drafting support, citizen guidance',
  'Automated sentencing, guilt prediction, risk scoring, judicial decisions',
  'Demo mode without API key; outputs require human review',
  true
) on conflict (model_key) do nothing;

insert into public.prompt_registry (task_key, version, template, output_schema, active) values
('timeline_extract', '1.0', 'Extract timeline events from case facts as JSON array', '{"type":"array"}'::jsonb, true),
('entity_extract', '1.0', 'Extract entities from case facts', '{"type":"array"}'::jsonb, true),
('rights_assess', '1.0', 'Suggest fair-trial review areas only', '{"type":"object"}'::jsonb, true),
('contradiction_scan', '1.0', 'Flag potential inconsistencies with citations', '{"type":"array"}'::jsonb, true)
on conflict (task_key, version) do nothing;

-- Realtime
do $$ begin alter publication supabase_realtime add table public.ai_reviews; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.case_timeline_events; exception when others then null; end $$;

select 'Verdiqt v2 intelligence platform migration applied.' as status;
