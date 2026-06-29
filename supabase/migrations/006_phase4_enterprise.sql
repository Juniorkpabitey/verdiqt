-- Verdiqt Phase 4: Enterprise & court integration
-- Run AFTER 005_v2_intelligence_platform.sql

create extension if not exists pgcrypto;
create or replace function public.is_self_assignable_role(p_role text)
returns boolean language sql immutable as $$
  select p_role in ('client', 'lawyer', 'legal_aid');
$$;

-- Update profile bootstrap to honor signup role selection
create or replace function public.ensure_my_profile(
  p_full_name text default null,
  p_requested_role text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  user_email text;
  resolved_role text := 'client';
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_requested_role is not null and public.is_self_assignable_role(p_requested_role) then
    resolved_role := p_requested_role;
  end if;

  select email into user_email from auth.users where id = uid;

  insert into public.profiles (id, role, full_name, email, trial_credits)
  values (uid, resolved_role, coalesce(p_full_name, ''), user_email, 5)
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    full_name = coalesce(
      nullif(public.profiles.full_name, ''),
      excluded.full_name
    ),
    role = case
      when public.profiles.role in ('admin', 'hr_monitor', 'researcher') then public.profiles.role
      when public.is_self_assignable_role(coalesce(p_requested_role, '')) then p_requested_role
      else public.profiles.role
    end,
    updated_at = now();
end;
$$;

-- Platform settings (data residency, feature flags)
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

insert into public.platform_settings (key, value) values
  ('data_residency', '{"region":"eu-west-1","provider":"supabase","label":"EU West (Ireland)","pii_stored_in_region":true}'::jsonb),
  ('prohibited_ai_uses', '["automated_sentencing","guilt_prediction","risk_scoring","judicial_decisions"]'::jsonb)
on conflict (key) do nothing;

-- SOC2-aligned security event log (immutable insert-only for non-admins)
create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'auth.login', 'auth.logout', 'auth.oauth', 'auth.failed',
    'data.export', 'data.api_access', 'admin.action', 'integration.webhook'
  )),
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  actor_id uuid references public.profiles(id) on delete set null,
  resource_type text,
  resource_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_events_created_at_idx on public.security_events (created_at desc);
create index if not exists security_events_event_type_idx on public.security_events (event_type);

-- E-filing / contestability export bundles
create table if not exists public.filing_exports (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  export_type text not null check (export_type in ('filing_prep', 'contestability', 'case_bundle')),
  status text not null default 'ready' check (status in ('pending', 'ready', 'failed')),
  bundle jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists filing_exports_case_id_idx on public.filing_exports (case_id);

-- Organization API keys for external case management integrations
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  scopes text[] not null default '{case:read}',
  active boolean not null default true,
  last_used_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- RPC: log security event
create or replace function public.log_security_event(
  p_event_type text,
  p_severity text default 'info',
  p_resource_type text default null,
  p_resource_id text default null,
  p_meta jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare eid uuid;
begin
  insert into public.security_events (event_type, severity, actor_id, resource_type, resource_id, meta)
  values (p_event_type, coalesce(p_severity, 'info'), auth.uid(), p_resource_type, p_resource_id, coalesce(p_meta, '{}'::jsonb))
  returning id into eid;
  return eid;
end;
$$;

grant execute on function public.log_security_event(text, text, text, text, jsonb) to authenticated;

-- RPC: anonymized research metrics (no PII)
create or replace function public.get_anonymized_research_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare result jsonb;
begin
  if not (public.is_researcher() or public.is_admin()) then
    raise exception 'Access denied';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'total_users', (select count(*) from public.profiles),
    'users_by_role', (
      select coalesce(jsonb_object_agg(role, cnt), '{}'::jsonb)
      from (select role, count(*) as cnt from public.profiles group by role) r
    ),
    'total_cases', (select count(*) from public.cases),
    'cases_by_stage', (
      select coalesce(jsonb_object_agg(coalesce(procedural_stage, 'unknown'), cnt), '{}'::jsonb)
      from (select procedural_stage, count(*) as cnt from public.cases group by procedural_stage) s
    ),
    'cases_by_country', (
      select coalesce(jsonb_object_agg(coalesce(country_code, 'unknown'), cnt), '{}'::jsonb)
      from (select country_code, count(*) as cnt from public.cases group by country_code) c
    ),
    'total_ai_interactions', (select count(*) from public.ai_interactions),
    'ai_reviews_by_status', (
      select coalesce(jsonb_object_agg(status, cnt), '{}'::jsonb)
      from (select status, count(*) as cnt from public.ai_reviews group by status) rv
    ),
    'pathway_completions', (select count(*) from public.procedure_pathways where jsonb_array_length(completed_steps) > 0),
    'governance_open_incidents', (select count(*) from public.governance_incidents where status = 'open'),
    'human_override_rate', (
      select case when total = 0 then 0
        else round((overridden::numeric / total) * 100, 1) end
      from (
        select
          count(*) filter (where human_edited is not null) as overridden,
          count(*) as total
        from public.ai_reviews
      ) x
    )
  ) into result;

  perform public.log_security_event('data.export', 'info', 'research_metrics', null, '{"anonymized":true}'::jsonb);
  return result;
end;
$$;

grant execute on function public.get_anonymized_research_metrics() to authenticated;

-- RPC: build filing export bundle (lawyer-approved content only for client-facing sections)
create or replace function public.build_filing_export(
  p_case_id uuid,
  p_export_type text default 'filing_prep'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  eid uuid;
  bundle jsonb;
  case_row record;
begin
  if not public.user_can_access_case(p_case_id) and not public.is_admin() then
    raise exception 'Access denied';
  end if;
  if not public.is_legal_professional() and not public.is_admin() then
    raise exception 'Only legal professionals may create filing exports';
  end if;

  select id, title, jurisdiction, country_code, procedural_stage, status, created_at
  into case_row from public.cases where id = p_case_id;

  bundle := jsonb_build_object(
    'export_type', p_export_type,
    'generated_at', now(),
    'disclaimer', 'Assistive filing preparation — not a legal determination. Lawyer sign-off required before court use.',
    'informational_only', true,
    'case', jsonb_build_object(
      'id', case_row.id,
      'title', case_row.title,
      'jurisdiction', case_row.jurisdiction,
      'country_code', case_row.country_code,
      'procedural_stage', case_row.procedural_stage,
      'status', case_row.status
    ),
    'timeline', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', title, 'description', description, 'event_date', event_date,
        'lawyer_verified', lawyer_verified, 'ai_generated', ai_generated
      ) order by event_date nulls last)
      from public.case_timeline_events where case_id = p_case_id
    ), '[]'::jsonb),
    'entities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'entity_type', entity_type, 'label', label, 'lawyer_verified', lawyer_verified
      ))
      from public.case_entities where case_id = p_case_id
    ), '[]'::jsonb),
    'approved_reviews', coalesce((
      select jsonb_agg(jsonb_build_object(
        'output_type', output_type, 'confidence', confidence,
        'human_edited', human_edited, 'reviewed_at', reviewed_at
      ))
      from public.ai_reviews
      where case_id = p_case_id and status in ('approved', 'shared_with_client')
    ), '[]'::jsonb),
    'rights_assessments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'assessment_type', assessment_type, 'status', status, 'risk_alerts', risk_alerts
      ))
      from public.rights_assessments where case_id = p_case_id and status = 'approved'
    ), '[]'::jsonb)
  );

  insert into public.filing_exports (case_id, export_type, status, bundle, created_by)
  values (p_case_id, p_export_type, 'ready', bundle, auth.uid())
  returning id into eid;

  perform public.log_security_event('data.export', 'info', 'filing_export', eid::text,
    jsonb_build_object('case_id', p_case_id, 'export_type', p_export_type));
  perform public.log_audit('filing_export_created', 'filing_export', eid::text,
    jsonb_build_object('case_id', p_case_id, 'export_type', p_export_type));

  if exists (select 1 from public.evidence_files where case_id = p_case_id) then
    perform public.log_evidence_custody(
      (select id from public.evidence_files where case_id = p_case_id order by created_at limit 1),
      'exported',
      'Filing export bundle created',
      jsonb_build_object('export_id', eid, 'export_type', p_export_type)
    );
  end if;

  return eid;
end;
$$;

grant execute on function public.build_filing_export(uuid, text) to authenticated;

-- RPC: create API key (returns full key once)
create or replace function public.create_api_key(
  p_name text,
  p_organization_id uuid default null,
  p_scopes text[] default array['case:read']
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_key text;
  key_hash text;
  prefix text;
  kid uuid;
begin
  if not public.is_admin() then
    raise exception 'Access denied';
  end if;

  raw_key := 'vdq_' || encode(gen_random_bytes(24), 'hex');
  prefix := left(raw_key, 12);
  key_hash := encode(digest(raw_key, 'sha256'), 'hex');

  insert into public.api_keys (organization_id, name, key_prefix, key_hash, scopes, created_by)
  values (p_organization_id, p_name, prefix, key_hash, coalesce(p_scopes, array['case:read']), auth.uid())
  returning id into kid;

  perform public.log_security_event('admin.action', 'info', 'api_key', kid::text,
    jsonb_build_object('name', p_name, 'prefix', prefix));

  return jsonb_build_object('id', kid, 'key', raw_key, 'prefix', prefix, 'scopes', p_scopes);
end;
$$;

grant execute on function public.create_api_key(text, uuid, text[]) to authenticated;

-- RPC: validate API key (service role / edge function use)
create or replace function public.validate_api_key(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare row record;
begin
  select * into row from public.api_keys
  where key_hash = encode(digest(p_key, 'sha256'), 'hex')
    and active = true;

  if row.id is null then
    return null;
  end if;

  update public.api_keys set last_used_at = now() where id = row.id;

  return jsonb_build_object(
    'id', row.id,
    'organization_id', row.organization_id,
    'scopes', row.scopes,
    'name', row.name
  );
end;
$$;

grant execute on function public.validate_api_key(text) to service_role;

-- RPC: external case export (API key or authenticated legal professional)
create or replace function public.export_case_for_integration(p_case_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare result jsonb;
begin
  if not public.user_can_access_case(p_case_id) and not public.is_admin() then
    raise exception 'Access denied';
  end if;

  select jsonb_build_object(
    'case_id', c.id,
    'title', c.title,
    'status', c.status,
    'procedural_stage', c.procedural_stage,
    'country_code', c.country_code,
    'jurisdiction', c.jurisdiction,
    'updated_at', c.updated_at,
    'timeline_count', (select count(*) from public.case_timeline_events where case_id = p_case_id),
    'entity_count', (select count(*) from public.case_entities where case_id = p_case_id),
    'pending_reviews', (select count(*) from public.ai_reviews where case_id = p_case_id and status in ('draft', 'reviewed')),
    'informational_only', true
  ) into result
  from public.cases c where c.id = p_case_id;

  perform public.log_security_event('data.api_access', 'info', 'case', p_case_id::text, '{"via":"integration"}'::jsonb);
  return result;
end;
$$;

grant execute on function public.export_case_for_integration(uuid) to authenticated;

-- Organizations admin write
drop policy if exists "organizations admin write" on public.organizations;
create policy "organizations admin write" on public.organizations for all
  using (public.is_admin()) with check (public.is_admin());

-- RLS for new tables
alter table public.platform_settings enable row level security;
alter table public.security_events enable row level security;
alter table public.filing_exports enable row level security;
alter table public.api_keys enable row level security;

drop policy if exists "platform settings read" on public.platform_settings;
create policy "platform settings read" on public.platform_settings for select
  to authenticated using (true);

drop policy if exists "platform settings admin write" on public.platform_settings;
create policy "platform settings admin write" on public.platform_settings for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "security events admin read" on public.security_events;
create policy "security events admin read" on public.security_events for select
  using (public.is_admin() or public.is_hr_monitor());

drop policy if exists "security events insert" on public.security_events;
create policy "security events insert" on public.security_events for insert
  with check (auth.uid() is not null);

drop policy if exists "filing exports case access" on public.filing_exports;
create policy "filing exports case access" on public.filing_exports for all
  using (public.user_can_access_case(case_id) or public.is_admin())
  with check (public.user_can_access_case(case_id) or public.is_admin());

drop policy if exists "api keys admin" on public.api_keys;
create policy "api keys admin" on public.api_keys for all
  using (public.is_admin()) with check (public.is_admin());

select 'Verdiqt Phase 4 enterprise migration applied.' as status;
