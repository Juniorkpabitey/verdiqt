import { useEffect, useState } from 'react'
import PageScaffold from '../components/layout/PageScaffold'
import AiDisclaimer from '../components/ui/AiDisclaimer'
import { Button } from '../components/ui/Button'
import { getErrorMessage } from '../lib/errors'
import { listPendingReviews, updateReviewStatus } from '../lib/services/reviews'
import type { AiReview } from '../types/platform'
import { useAuth } from '../context/AuthContext'
import { Loader2 } from 'lucide-react'

export default function ReviewQueuePage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<AiReview[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    const data = await listPendingReviews()
    setRows(data)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await load()
      } catch (e) {
        if (!cancelled) setErr(getErrorMessage(e))
      }
    })()
    return () => { cancelled = true }
  }, [])

  const act = async (id: string, status: 'approved' | 'rejected' | 'shared_with_client') => {
    setBusy(id)
    try {
      await updateReviewStatus(id, status)
      await load()
    } catch (e) {
      setErr(getErrorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const canReview = user?.role === 'lawyer' || user?.role === 'admin' || user?.role === 'legal_aid'

  return (
    <PageScaffold title="Human review queue" subtitle="Approve AI drafts before client share or court prep.">
      <AiDisclaimer />
      {!canReview ? (
        <p className="text-sm text-zinc-600 mt-4">Review queue is available to legal professionals.</p>
      ) : null}
      {err ? <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</p> : null}

      <ul className="mt-6 space-y-3">
        {rows.length === 0 ? (
          <li className="text-sm text-zinc-500 text-center py-10">No pending reviews.</li>
        ) : rows.map((r) => (
          <li key={r.id} className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
            <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
              <span className="font-mono">#{r.id.slice(0, 8)}</span>
              <span className="capitalize">{r.output_type}</span>
              <span className="capitalize">{r.status}</span>
              {r.confidence != null ? <span>{Math.round(r.confidence * 100)}% confidence</span> : null}
            </div>
            <pre className="text-xs bg-zinc-50 p-3 rounded-lg overflow-auto max-h-40">{JSON.stringify(r.ai_draft, null, 2)}</pre>
            {canReview ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={busy === r.id} onClick={() => act(r.id, 'approved')}>Approve</Button>
                <Button type="button" variant="secondary" disabled={busy === r.id} onClick={() => act(r.id, 'shared_with_client')}>Share with client</Button>
                <Button type="button" variant="ghost" disabled={busy === r.id} onClick={() => act(r.id, 'rejected')}>Reject</Button>
                {busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </PageScaffold>
  )
}
