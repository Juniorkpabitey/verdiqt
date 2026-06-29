import { supabase } from '../supabase'
import type { AiMeta } from '../../types/platform'

export type AiAction =
  | 'chat'
  | 'analyze'
  | 'case-analyze'
  | 'timeline-extract'
  | 'entity-extract'
  | 'rights-assess'
  | 'contradiction-scan'
  | 'plain-language'

type InvokeBody = Record<string, unknown>

export type StructuredAiResponse<T = unknown> = {
  output: T
  meta: AiMeta
  review_id?: string
  answer?: string
  sources?: string[]
  report_markdown?: string
}

async function invoke<T>(body: InvokeBody): Promise<T> {
  const { data, error } = await supabase.functions.invoke('ai-intelligence', { body })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data as T
}

export async function chat(message: string) {
  return invoke<{ answer: string; sources: string[]; meta?: AiMeta }>({
    action: 'chat',
    message,
  })
}

export async function analyzeQuery(query: string) {
  return invoke<{ answer: string; sources: string[]; meta?: AiMeta }>({
    action: 'analyze',
    query,
  })
}

export async function analyzeCase(caseId: string) {
  return invoke<{ ok: boolean; report_markdown: string; review_id?: string; meta?: AiMeta }>({
    action: 'case-analyze',
    case_id: caseId,
  })
}

export async function extractTimeline(caseId: string) {
  return invoke<StructuredAiResponse<{ events: unknown[] }>>({
    action: 'timeline-extract',
    case_id: caseId,
  })
}

export async function extractEntities(caseId: string) {
  return invoke<StructuredAiResponse<{ entities: unknown[] }>>({
    action: 'entity-extract',
    case_id: caseId,
  })
}

export async function assessRights(caseId: string, checklist: Record<string, boolean>) {
  return invoke<StructuredAiResponse<{ summary: string; alerts: string[] }>>({
    action: 'rights-assess',
    case_id: caseId,
    checklist,
  })
}

export async function scanContradictions(caseId: string) {
  return invoke<StructuredAiResponse<{ flags: unknown[] }>>({
    action: 'contradiction-scan',
    case_id: caseId,
  })
}

export async function logDocumentGeneration(
  templateType: string,
  context: Record<string, unknown>,
  document: string,
): Promise<void> {
  await supabase.rpc('log_ai_interaction', {
    p_channel: 'document_gen',
    p_prompt: JSON.stringify({ template: templateType, context }).slice(0, 4000),
    p_response: document.slice(0, 8000),
  })
  await supabase.rpc('log_audit', { p_action: 'document_generate', p_entity: 'document' })
}
