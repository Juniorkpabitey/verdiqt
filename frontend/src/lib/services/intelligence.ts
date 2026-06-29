import { supabase } from '../supabase'
import type {
  CaseEntity,
  ContradictionFlag,
  JurisdictionPack,
  RightsAssessment,
  TimelineEvent,
} from '../../types/platform'

export async function listTimeline(caseId: string): Promise<TimelineEvent[]> {
  const { data, error } = await supabase
    .from('case_timeline_events')
    .select('*')
    .eq('case_id', caseId)
    .order('event_date', { ascending: true, nullsFirst: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as TimelineEvent[]
}

export async function listEntities(caseId: string): Promise<CaseEntity[]> {
  const { data, error } = await supabase
    .from('case_entities')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as CaseEntity[]
}

export async function listContradictions(caseId: string): Promise<ContradictionFlag[]> {
  const { data, error } = await supabase
    .from('contradiction_flags')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as ContradictionFlag[]
}

export async function verifyTimelineEvent(id: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession()
  const { error } = await supabase
    .from('case_timeline_events')
    .update({ lawyer_verified: true, verified_by: session.session?.user.id, verified_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function listRightsAssessments(caseId: string): Promise<RightsAssessment[]> {
  const { data, error } = await supabase
    .from('rights_assessments')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as RightsAssessment[]
}

export async function saveRightsAssessment(
  caseId: string,
  assessmentType: string,
  checklist: Record<string, boolean>,
  aiSummary?: string,
  alerts?: string[],
): Promise<void> {
  const { data: session } = await supabase.auth.getSession()
  const { error } = await supabase.from('rights_assessments').insert({
    case_id: caseId,
    assessment_type: assessmentType,
    checklist_responses: checklist,
    ai_summary: aiSummary ?? null,
    risk_alerts: alerts ?? [],
    created_by: session.session?.user.id,
    status: 'draft',
  })
  if (error) throw new Error(error.message)
}

export async function listJurisdictionPacks(): Promise<JurisdictionPack[]> {
  const { data, error } = await supabase
    .from('jurisdiction_packs')
    .select('id, country_code, name, version, content')
    .eq('active', true)
    .order('country_code')
  if (error) throw new Error(error.message)
  return (data ?? []) as JurisdictionPack[]
}

export async function updateCaseStage(
  caseId: string,
  stage: string,
  countryCode?: string,
  packId?: string,
): Promise<void> {
  const { error } = await supabase
    .from('cases')
    .update({
      procedural_stage: stage,
      country_code: countryCode ?? null,
      jurisdiction_pack_id: packId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', caseId)
  if (error) throw new Error(error.message)
}

export async function listCustodyLog(evidenceFileId: string) {
  const { data, error } = await supabase
    .from('evidence_custody_log')
    .select('*')
    .eq('evidence_file_id', evidenceFileId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function logCustody(evidenceFileId: string, action: string, notes?: string) {
  const { error } = await supabase.rpc('log_evidence_custody', {
    p_evidence_file_id: evidenceFileId,
    p_action: action,
    p_notes: notes ?? null,
  })
  if (error) throw new Error(error.message)
}
