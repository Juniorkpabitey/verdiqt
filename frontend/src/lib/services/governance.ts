import { supabase } from '../supabase'
import type { AiModelRegistry, GovernanceIncident } from '../../types/platform'

export async function listModelRegistry(): Promise<AiModelRegistry[]> {
  const { data, error } = await supabase.from('ai_model_registry').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as AiModelRegistry[]
}

export async function listGovernanceIncidents(): Promise<GovernanceIncident[]> {
  const { data, error } = await supabase
    .from('governance_incidents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return (data ?? []) as GovernanceIncident[]
}

export async function reportIncident(input: {
  incident_type: string
  severity: string
  description: string
  case_id?: string
}): Promise<void> {
  const { data: session } = await supabase.auth.getSession()
  const { error } = await supabase.from('governance_incidents').insert({
    ...input,
    reported_by: session.session?.user.id,
    status: 'open',
  })
  if (error) throw new Error(error.message)
}

export async function getGovernanceStats() {
  const [models, incidents, reviews, interactions] = await Promise.all([
    supabase.from('ai_model_registry').select('id', { count: 'exact', head: true }),
    supabase.from('governance_incidents').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('ai_reviews').select('id', { count: 'exact', head: true }).in('status', ['draft', 'reviewed']),
    supabase.from('ai_interactions').select('id', { count: 'exact', head: true }),
  ])
  return {
    models: models.count ?? 0,
    openIncidents: incidents.count ?? 0,
    pendingReviews: reviews.count ?? 0,
    totalAiInteractions: interactions.count ?? 0,
  }
}

export async function getResearchStats(): Promise<import('./enterprise').ResearchMetrics> {
  const { getAnonymizedResearchMetrics } = await import('./enterprise')
  return getAnonymizedResearchMetrics()
}
