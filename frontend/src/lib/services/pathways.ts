import { supabase } from '../supabase'
import type { ProcedurePathway } from '../../types/platform'

export async function getOrCreatePathway(stage: string, caseId?: string): Promise<ProcedurePathway> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) throw new Error('Not authenticated')

  if (caseId) {
    const { data: existing } = await supabase
      .from('procedure_pathways')
      .select('*')
      .eq('user_id', userId)
      .eq('case_id', caseId)
      .eq('stage', stage)
      .maybeSingle()
    if (existing) return existing as ProcedurePathway
  }

  const { data, error } = await supabase
    .from('procedure_pathways')
    .insert({ user_id: userId, case_id: caseId ?? null, stage, responses: {}, completed_steps: [] })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as ProcedurePathway
}

export async function updatePathway(
  id: string,
  responses: Record<string, string>,
  completedSteps: string[],
): Promise<void> {
  const { error } = await supabase
    .from('procedure_pathways')
    .update({ responses, completed_steps: completedSteps, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function listMyPathways(): Promise<ProcedurePathway[]> {
  const { data: session } = await supabase.auth.getSession()
  const { data, error } = await supabase
    .from('procedure_pathways')
    .select('*')
    .eq('user_id', session.session?.user.id)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as ProcedurePathway[]
}
