import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../lib/errors'
import {
  assignLawyer,
  deleteAdminCase,
  listAdminCases,
  listLawyers,
} from '../../lib/services/admin'
import { Button } from '../../components/ui/Button'

type Row = {
  id: string
  user_id: string
  title: string
  status: string
  jurisdiction: string | null
  created_at: string
  facts_excerpt: string
}

type LawyerRow = {
  id: string
  email: string
  full_name: string | null
}

export default function AdminCasesPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [lawyers, setLawyers] = useState<LawyerRow[]>([])
  const [selectedLawyerByCase, setSelectedLawyerByCase] = useState<Record<string, string>>({})
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    const [casesData, lawyersData] = await Promise.all([listAdminCases(), listLawyers()])
    setRows(casesData)
    setLawyers(lawyersData)
    const map: Record<string, string> = {}
    casesData.forEach((c) => {
      if (lawyersData[0]) map[c.id] = lawyersData[0].id
    })
    setSelectedLawyerByCase(map)
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
    return () => {
      cancelled = true
    }
  }, [])

  const remove = async (id: string) => {
    if (!confirm('Delete this case? This cannot be undone.')) return
    setBusy(id)
    setErr(null)
    try {
      await deleteAdminCase(id)
      await load()
    } catch (e) {
      setErr(getErrorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const assign = async (caseId: string) => {
    const lawyerId = selectedLawyerByCase[caseId]
    if (!lawyerId) return
    setBusy(`assign-${caseId}`)
    setErr(null)
    try {
      await assignLawyer(caseId, lawyerId)
      await load()
    } catch (e) {
      setErr(getErrorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-4 sm:px-8 py-6">
        <h1 className="text-xl font-semibold text-zinc-900">Cases</h1>
        <p className="text-sm text-zinc-600 mt-1">Cross-tenant visibility for support and audits.</p>
      </header>

      <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-4">
        {err ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {err}
          </p>
        ) : null}

        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-900">{r.title}</p>
                  <p className="text-xs text-zinc-500">
                    Case #{r.id} · User #{r.user_id} · {r.status} ·{' '}
                    {r.jurisdiction || '—'} · {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy === r.id}
                  onClick={() => remove(r.id)}
                  className="text-red-600 hover:bg-red-50"
                >
                  Delete
                </Button>
              </div>
              <p className="text-sm text-zinc-600">{r.facts_excerpt}</p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedLawyerByCase[r.id] || ''}
                  onChange={(e) =>
                    setSelectedLawyerByCase((prev) => ({ ...prev, [r.id]: e.target.value }))
                  }
                  className="border border-zinc-200 rounded-lg px-2 py-1.5 text-sm"
                >
                  {lawyers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.full_name || l.email}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => assign(r.id)}
                  disabled={!lawyers.length || busy === `assign-${r.id}`}
                  className="text-xs"
                >
                  {busy === `assign-${r.id}` ? 'Assigning…' : 'Assign lawyer'}
                </Button>
              </div>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="text-center text-sm text-zinc-500 py-12">No cases yet.</li>
          ) : null}
        </ul>
      </div>
    </div>
  )
}
