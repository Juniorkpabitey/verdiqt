import { supabase } from '../supabase'
import type { AiReview, AiReviewStatus } from '../../types/platform'

export async function listReviews(caseId?: string): Promise<AiReview[]> {
  let q = supabase.from('ai_reviews').select('*').order('created_at', { ascending: false })
  if (caseId) q = q.eq('case_id', caseId)
  const { data, error } = await q.limit(100)
  if (error) throw new Error(error.message)
  return (data ?? []) as AiReview[]
}

export async function listPendingReviews(): Promise<AiReview[]> {
  const { data, error } = await supabase
    .from('ai_reviews')
    .select('*')
    .in('status', ['draft', 'reviewed'])
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)
  return (data ?? []) as AiReview[]
}

export async function updateReviewStatus(
  reviewId: string,
  status: AiReviewStatus,
  humanEdited?: Record<string, unknown>,
  rejectionReason?: string,
): Promise<void> {
  const { error } = await supabase.rpc('update_ai_review_status', {
    p_review_id: reviewId,
    p_status: status,
    p_human_edited: humanEdited ?? null,
    p_rejection_reason: rejectionReason ?? null,
  })
  if (error) throw new Error(error.message)
}
