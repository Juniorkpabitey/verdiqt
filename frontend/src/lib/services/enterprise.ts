import { supabase } from '../supabase'
import type { UserRole } from '../../types/platform'

export type Organization = {
  id: string
  name: string
  type: string
  country_code: string | null
  created_at: string
}

export type IntegrationEndpoint = {
  id: string
  organization_id: string | null
  name: string
  endpoint_type: string
  config: Record<string, unknown>
  active: boolean
  created_at: string
}

export type ApiKeyRow = {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  active: boolean
  last_used_at: string | null
  created_at: string
}

export type FilingExport = {
  id: string
  case_id: string
  export_type: string
  status: string
  bundle: Record<string, unknown>
  created_at: string
}

export type PlatformSetting = {
  key: string
  value: Record<string, unknown>
  updated_at: string
}

export type SecurityEvent = {
  id: string
  event_type: string
  severity: string
  actor_id: string | null
  resource_type: string | null
  resource_id: string | null
  meta: Record<string, unknown>
  created_at: string
}

export type ResearchMetrics = {
  generated_at: string
  total_users: number
  users_by_role: Record<string, number>
  total_cases: number
  cases_by_stage: Record<string, number>
  cases_by_country: Record<string, number>
  total_ai_interactions: number
  ai_reviews_by_status: Record<string, number>
  pathway_completions: number
  governance_open_incidents: number
  human_override_rate: number
}

export const SELF_ASSIGNABLE_ROLES: { role: UserRole; label: string; description: string }[] = [
  { role: 'client', label: 'Citizen / Client', description: 'Access guidance, upload documents, request counsel' },
  { role: 'lawyer', label: 'Lawyer', description: 'Case intelligence workspace, review queue, client matters' },
  { role: 'legal_aid', label: 'Legal aid provider', description: 'Public defender or legal aid organization access' },
]

export async function logSecurityEvent(
  eventType: string,
  resourceType?: string,
  resourceId?: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.rpc('log_security_event', {
    p_event_type: eventType,
    p_severity: 'info',
    p_resource_type: resourceType ?? null,
    p_resource_id: resourceId ?? null,
    p_meta: meta ?? {},
  })
  if (error) console.warn('Security event log failed:', error.message)
}

export async function listOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase.from('organizations').select('*').order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as Organization[]
}

export async function createOrganization(input: {
  name: string
  type: string
  country_code?: string
}): Promise<Organization> {
  const { data, error } = await supabase.from('organizations').insert(input).select().single()
  if (error) throw new Error(error.message)
  return data as Organization
}

export async function listIntegrationEndpoints(): Promise<IntegrationEndpoint[]> {
  const { data, error } = await supabase.from('integration_endpoints').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as IntegrationEndpoint[]
}

export async function upsertIntegrationEndpoint(input: {
  id?: string
  organization_id?: string | null
  name: string
  endpoint_type: string
  config?: Record<string, unknown>
  active?: boolean
}): Promise<void> {
  const { error } = await supabase.from('integration_endpoints').upsert({
    ...input,
    config: input.config ?? {},
    active: input.active ?? false,
  })
  if (error) throw new Error(error.message)
}

export async function listApiKeys(): Promise<ApiKeyRow[]> {
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, scopes, active, last_used_at, created_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as ApiKeyRow[]
}

export async function createApiKey(name: string, organizationId?: string): Promise<{ id: string; key: string; prefix: string }> {
  const { data, error } = await supabase.rpc('create_api_key', {
    p_name: name,
    p_organization_id: organizationId ?? null,
    p_scopes: ['case:read'],
  })
  if (error) throw new Error(error.message)
  return data as { id: string; key: string; prefix: string }
}

export async function revokeApiKey(id: string): Promise<void> {
  const { error } = await supabase.from('api_keys').update({ active: false }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getPlatformSettings(): Promise<PlatformSetting[]> {
  const { data, error } = await supabase.from('platform_settings').select('key, value, updated_at')
  if (error) throw new Error(error.message)
  return (data ?? []) as PlatformSetting[]
}

export async function updatePlatformSetting(key: string, value: Record<string, unknown>): Promise<void> {
  const { data: session } = await supabase.auth.getSession()
  const { error } = await supabase.from('platform_settings').upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
    updated_by: session.session?.user.id,
  })
  if (error) throw new Error(error.message)
}

export async function listSecurityEvents(limit = 100): Promise<SecurityEvent[]> {
  const { data, error } = await supabase
    .from('security_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []) as SecurityEvent[]
}

export async function getAnonymizedResearchMetrics(): Promise<ResearchMetrics> {
  const { data, error } = await supabase.rpc('get_anonymized_research_metrics')
  if (error) throw new Error(error.message)
  return data as ResearchMetrics
}

export async function buildFilingExport(
  caseId: string,
  exportType: 'filing_prep' | 'contestability' | 'case_bundle' = 'filing_prep',
): Promise<FilingExport> {
  const { data: exportId, error: rpcErr } = await supabase.rpc('build_filing_export', {
    p_case_id: caseId,
    p_export_type: exportType,
  })
  if (rpcErr) throw new Error(rpcErr.message)

  const { data, error } = await supabase
    .from('filing_exports')
    .select('*')
    .eq('id', exportId)
    .single()
  if (error) throw new Error(error.message)
  return data as FilingExport
}

export async function listFilingExports(caseId: string): Promise<FilingExport[]> {
  const { data, error } = await supabase
    .from('filing_exports')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as FilingExport[]
}

export function downloadJsonBundle(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function signInWithOAuth(provider: 'google' | 'azure'): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/app` },
  })
  if (error) throw new Error(error.message)
}
