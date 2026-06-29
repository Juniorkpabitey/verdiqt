import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../lib/errors'
import { listActivityLogs, listAiLogs } from '../../lib/services/admin'

type AiRow = {
  id: string
  user_id: string | null
  channel: string
  case_id: string | null
  prompt_excerpt: string | null
  response_excerpt: string | null
  meta: unknown
  created_at: string
}

type ActRow = {
  id: string
  user_id: string | null
  action: string
  detail: string | null
  created_at: string
}

export default function AdminLogsPage() {
  const [ai, setAi] = useState<AiRow[]>([])
  const [act, setAct] = useState<ActRow[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [aiLogs, activityLogs] = await Promise.all([listAiLogs(), listActivityLogs()])
        if (!cancelled) {
          setAi(aiLogs)
          setAct(activityLogs)
        }
      } catch (e) {
        if (!cancelled) setErr(getErrorMessage(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-4 sm:px-8 py-6">
        <h1 className="text-xl font-semibold text-zinc-900">Logs & analytics</h1>
        <p className="text-sm text-zinc-600 mt-1">
          AI interaction excerpts and high-level activity across the platform.
        </p>
      </header>

      <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-10">
        {err ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {err}
          </p>
        ) : null}

        <section className="space-y-3">
          <h2 className="font-semibold text-zinc-900">AI interactions</h2>
          <ul className="space-y-3">
            {ai.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm text-sm"
              >
                <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                  <span className="font-mono">#{r.id}</span>
                  <span className="capitalize">{r.channel}</span>
                  <span>user {r.user_id ?? '—'}</span>
                  <span>case {r.case_id ?? '—'}</span>
                  <span>{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-zinc-800 whitespace-pre-wrap">
                  <span className="text-zinc-500 text-xs uppercase tracking-wide">Prompt · </span>
                  {r.prompt_excerpt}
                </p>
                <p className="mt-2 text-zinc-700 whitespace-pre-wrap">
                  <span className="text-zinc-500 text-xs uppercase tracking-wide">Response · </span>
                  {r.response_excerpt}
                </p>
              </li>
            ))}
            {ai.length === 0 ? (
              <li className="text-center text-sm text-zinc-500 py-8">No AI logs yet.</li>
            ) : null}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-zinc-900">Activity</h2>
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-zinc-500">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {act.map((r) => (
                  <tr key={r.id} className="text-zinc-800">
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-500">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{r.user_id ?? '—'}</td>
                    <td className="px-4 py-3 font-medium">{r.action}</td>
                    <td className="px-4 py-3 text-zinc-600">{r.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {act.length === 0 ? (
              <p className="text-center text-sm text-zinc-500 py-8">No activity yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
