export type UserRole =
  | 'client'
  | 'lawyer'
  | 'admin'
  | 'hr_monitor'
  | 'researcher'
  | 'legal_aid'

export type ProceduralStage =
  | 'arrest'
  | 'investigation'
  | 'charge'
  | 'bail'
  | 'trial'
  | 'appeal'
  | 'closed'

export type AiReviewStatus = 'draft' | 'reviewed' | 'approved' | 'rejected' | 'shared_with_client'

export type AiMeta = {
  task_key?: string
  model_key?: string
  prompt_version?: string
  confidence?: number
  limitations?: string[]
  sources?: string[]
  informational_only?: boolean
  requires_human_review?: boolean
  generated_at?: string
}

export type TimelineEvent = {
  id: string
  case_id: string
  event_date: string | null
  title: string
  description: string | null
  actors: unknown[]
  ai_generated: boolean
  lawyer_verified: boolean
  created_at: string
}

export type CaseEntity = {
  id: string
  case_id: string
  entity_type: string
  label: string
  attributes: Record<string, unknown>
  ai_generated: boolean
  lawyer_verified: boolean
}

export type ContradictionFlag = {
  id: string
  case_id: string
  description: string
  ai_confidence: number | null
  status: string
  source_a_type: string
  source_b_type: string
}

export type RightsAssessment = {
  id: string
  case_id: string
  assessment_type: string
  checklist_responses: Record<string, boolean>
  ai_summary: string | null
  risk_alerts: string[]
  status: string
  created_at: string
}

export type AiReview = {
  id: string
  case_id: string | null
  output_type: string
  ai_draft: Record<string, unknown>
  human_edited: Record<string, unknown> | null
  confidence: number | null
  status: AiReviewStatus
  reviewed_at: string | null
  created_at: string
}

export type JurisdictionPack = {
  id: string
  country_code: string
  name: string
  version: string
  content: Record<string, unknown>
}

export type ProcedurePathway = {
  id: string
  case_id: string | null
  stage: string
  responses: Record<string, string>
  completed_steps: string[]
  updated_at: string
}

export type GovernanceIncident = {
  id: string
  incident_type: string
  severity: string
  description: string
  status: string
  created_at: string
}

export type AiModelRegistry = {
  id: string
  model_key: string
  provider: string
  version: string
  intended_use: string
  prohibited_uses: string
  limitations: string | null
  active: boolean
}

export const FAIR_TRIAL_CHECKLIST = [
  { key: 'informed_of_charge', label: 'Accused informed of charge in understandable language' },
  { key: 'adequate_time', label: 'Adequate time to prepare defense' },
  { key: 'legal_assistance', label: 'Access to legal assistance' },
  { key: 'interpreter', label: 'Interpreter available if needed' },
  { key: 'examine_witnesses', label: 'Opportunity to examine witnesses' },
  { key: 'presumption_innocence', label: 'Presumption of innocence respected' },
  { key: 'public_hearing', label: 'Public hearing unless exception applies' },
  { key: 'no_coerced_confession', label: 'No evidence of coerced confession' },
] as const

export const PROCEDURE_STAGES: { key: ProceduralStage; label: string; info: string }[] = [
  { key: 'arrest', label: 'Arrest', info: 'Know your rights when detained or arrested.' },
  { key: 'investigation', label: 'Investigation', info: 'Understand disclosure and evidence gathering.' },
  { key: 'charge', label: 'Charge', info: 'Learn what formal charges mean procedurally.' },
  { key: 'bail', label: 'Bail', info: 'Information about bail applications and factors courts may consider.' },
  { key: 'trial', label: 'Trial', info: 'Trial preparation information — not legal advice.' },
  { key: 'appeal', label: 'Appeal', info: 'General information about appeal pathways.' },
]

export const COUNTRY_CODES = [
  { code: 'GH', name: 'Ghana' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'ZA', name: 'South Africa' },
] as const
