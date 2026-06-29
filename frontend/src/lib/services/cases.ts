import { supabase } from '../supabase'
import { assertNoError } from '../errors'

export type CaseRow = {
  id: string
  title: string
  incident_report: string
  jurisdiction: string | null
  status: string
  created_at: string
}

export type CaseMessage = {
  id: string
  body: string
  sender_id: string
  created_at: string
}

export type CaseAnalysis = {
  id: string
  report_markdown: string
  created_at: string
}

export async function listCases(): Promise<CaseRow[]> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  const role = profile?.role ?? 'client'

  if (role === 'admin') {
    const { data, error } = await supabase
      .from('cases')
      .select('id, title, incident_report, jurisdiction, status, created_at')
      .order('created_at', { ascending: false })
      .limit(500)
    return assertNoError(data, error) as CaseRow[]
  }

  if (role === 'lawyer' || role === 'legal_aid') {
    const { data, error } = await supabase
      .from('assignments')
      .select('cases(id, title, incident_report, jurisdiction, status, created_at)')
      .eq('lawyer_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? [])
      .map((row) => {
        const c = row.cases
        if (!c || Array.isArray(c)) return null
        return c as CaseRow
      })
      .filter((c): c is CaseRow => c !== null)
  }

  const { data, error } = await supabase
    .from('cases')
    .select('id, title, incident_report, jurisdiction, status, created_at')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })

  return assertNoError(data, error) as CaseRow[]
}

export async function createCase(input: {
  title: string
  incident_report: string
  jurisdiction?: string | null
}): Promise<void> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) throw new Error('Not authenticated')

  const { error } = await supabase.from('cases').insert({
    owner_id: userId,
    title: input.title.trim(),
    incident_report: input.incident_report.trim(),
    jurisdiction: input.jurisdiction?.trim() || null,
    status: 'submitted',
  })

  if (error) throw new Error(error.message)
}

export async function requestLawyer(caseId: string, note?: string): Promise<void> {
  const { error } = await supabase
    .from('cases')
    .update({ status: 'in_review', updated_at: new Date().toISOString() })
    .eq('id', caseId)

  if (error) throw new Error(error.message)

  await supabase.rpc('log_audit', {
    p_action: 'lawyer_requested',
    p_entity: 'case',
    p_entity_id: caseId,
    p_meta: { note: note ?? null },
  })
}

export async function getCaseAnalyses(caseId: string): Promise<CaseAnalysis[]> {
  const { data, error } = await supabase
    .from('case_analyses')
    .select('id, report_markdown, created_at')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })

  return assertNoError(data, error) as CaseAnalysis[]
}

export async function getCaseMessages(caseId: string): Promise<CaseMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, body, sender_id, created_at')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })

  return assertNoError(data, error) as CaseMessage[]
}

export async function sendCaseMessage(
  caseId: string,
  body: string,
  recipientRole = 'all',
): Promise<void> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) throw new Error('Not authenticated')

  const { error } = await supabase.from('messages').insert({
    case_id: caseId,
    sender_id: userId,
    recipient_role: recipientRole,
    body: body.trim(),
    attachments: [],
  })

  if (error) throw new Error(error.message)

  await supabase.rpc('log_audit', {
    p_action: 'message_send',
    p_entity: 'case',
    p_entity_id: caseId,
  })
}

export async function uploadEvidence(caseId: string, file: File): Promise<void> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) throw new Error('Not authenticated')

  const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : 'bin'
  const path = `${caseId}/${crypto.randomUUID()}.${ext ?? 'bin'}`

  const { error: uploadError } = await supabase.storage.from('evidence').upload(path, file, {
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  })

  if (uploadError) throw new Error(uploadError.message)

  const fileType = ext === 'pdf' ? 'pdf' : ext === 'txt' ? 'text' : 'other'

  const { error: metaError } = await supabase.from('evidence_files').insert({
    case_id: caseId,
    uploaded_by: userId,
    type: fileType,
    storage_path: path,
    metadata: { filename: file.name },
  })

  if (metaError) throw new Error(metaError.message)

  await supabase.rpc('log_evidence_custody', {
    p_case_id: caseId,
    p_action: 'upload',
    p_storage_path: path,
    p_notes: file.name,
  })

  await supabase.rpc('log_audit', {
    p_action: 'evidence_upload',
    p_entity: 'case',
    p_entity_id: caseId,
    p_meta: { path },
  })
}

export function subscribeToCaseUpdates(
  caseId: string,
  onUpdate: () => void,
): () => void {
  const channel = supabase
    .channel(`case-${caseId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cases', filter: `id=eq.${caseId}` },
      () => onUpdate(),
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'case_analyses', filter: `case_id=eq.${caseId}` },
      () => onUpdate(),
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
