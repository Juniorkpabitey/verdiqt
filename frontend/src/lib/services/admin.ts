import { supabase } from '../supabase'
import { assertNoError } from '../errors'

export type AdminOverview = {
  users: number
  cases: number
  ai_interactions_total: number
  ai_interactions_24h: number
}

import type { UserRole } from '../../types/platform'

export type AdminUser = {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  trial_credits: number
  created_at: string
}

export type AdminCase = {
  id: string
  user_id: string
  title: string
  status: string
  jurisdiction: string | null
  created_at: string
  facts_excerpt: string
}

export type LawyerOption = {
  id: string
  email: string
  full_name: string | null
}

export type AiLogRow = {
  id: string
  user_id: string | null
  channel: string
  case_id: string | null
  prompt_excerpt: string | null
  response_excerpt: string | null
  meta: unknown
  created_at: string
}

export type ActivityLogRow = {
  id: string
  user_id: string | null
  action: string
  detail: string | null
  created_at: string
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const { data, error } = await supabase.rpc('admin_overview')
  if (error) throw new Error(error.message)
  return data as AdminOverview
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, trial_credits, created_at')
    .order('created_at', { ascending: false })

  return assertNoError(data, error) as AdminUser[]
}

export async function updateUserRole(userId: string, role: AdminUser['role']): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
  if (error) throw new Error(error.message)

  await supabase.rpc('log_audit', {
    p_action: 'admin_user_role_update',
    p_entity: 'profile',
    p_entity_id: userId,
    p_meta: { role },
  })
}

export async function listAdminCases(): Promise<AdminCase[]> {
  const { data, error } = await supabase
    .from('cases')
    .select('id, owner_id, title, status, jurisdiction, incident_report, created_at')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw new Error(error.message)

  return (data ?? []).map((c) => ({
    id: c.id,
    user_id: c.owner_id,
    title: c.title,
    status: c.status,
    jurisdiction: c.jurisdiction,
    created_at: c.created_at,
    facts_excerpt: (c.incident_report || '').slice(0, 200),
  }))
}

export async function deleteAdminCase(caseId: string): Promise<void> {
  const { error } = await supabase.from('cases').delete().eq('id', caseId)
  if (error) throw new Error(error.message)

  await supabase.rpc('log_audit', {
    p_action: 'admin_delete_case',
    p_entity: 'case',
    p_entity_id: caseId,
  })
}

export async function listLawyers(): Promise<LawyerOption[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('role', ['lawyer', 'legal_aid'])
    .order('created_at', { ascending: false })

  return assertNoError(data, error) as LawyerOption[]
}

export async function assignLawyer(caseId: string, lawyerId: string): Promise<void> {
  const { error } = await supabase.rpc('assign_lawyer_to_case', {
    p_case_id: caseId,
    p_lawyer_id: lawyerId,
  })
  if (error) throw new Error(error.message)
}

export async function listAiLogs(limit = 150): Promise<AiLogRow[]> {
  const { data, error } = await supabase
    .from('ai_interactions')
    .select('id, user_id, channel, case_id, prompt_excerpt, response_excerpt, meta, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  return assertNoError(data, error) as AiLogRow[]
}

export async function listActivityLogs(limit = 100): Promise<ActivityLogRow[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, actor_id, action, meta, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return (data ?? []).map((r) => ({
    id: r.id,
    user_id: r.actor_id,
    action: r.action,
    detail: r.meta ? JSON.stringify(r.meta) : null,
    created_at: r.created_at,
  }))
}
