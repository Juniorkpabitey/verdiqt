import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BriefcaseBusiness, CalendarClock, MessageSquare } from 'lucide-react'
import PageScaffold from '../../components/layout/PageScaffold'
import { getErrorMessage } from '../../lib/errors'
import { listAssignedCases } from '../../lib/services/lawyer'

type AssignedCase = {
  id: string
  title: string
  jurisdiction: string | null
  status: string
  created_at: string
}

export default function LawyerDashboardPage() {
  const [cases, setCases] = useState<AssignedCase[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await listAssignedCases()
        if (!cancelled) setCases(data)
      } catch (e) {
        if (!cancelled) setErr(getErrorMessage(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <PageScaffold title="Lawyer workspace" subtitle="Assigned criminal matters, collaboration, and appointments.">
      {err ? <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</p> : null}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <BriefcaseBusiness className="w-5 h-5 text-zinc-700" />
          <p className="text-xs mt-3 text-zinc-500 uppercase">Assigned cases</p>
          <p className="text-2xl font-semibold text-zinc-900">{cases.length}</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <MessageSquare className="w-5 h-5 text-zinc-700" />
          <p className="text-xs mt-3 text-zinc-500 uppercase">Client communication</p>
          <p className="text-sm text-zinc-700 mt-1">Use case messaging from each assigned case.</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <CalendarClock className="w-5 h-5 text-zinc-700" />
          <p className="text-xs mt-3 text-zinc-500 uppercase">Appointments</p>
          <p className="text-sm text-zinc-700 mt-1">Confirm or cancel consultation requests.</p>
        </div>
      </div>
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-900">Assigned matters</h2>
        </div>
        <ul className="divide-y divide-zinc-100">
          {cases.length === 0 ? (
            <li className="px-5 py-8 text-sm text-zinc-500 text-center">No assigned cases yet.</li>
          ) : (
            cases.map((c) => (
              <li key={c.id} className="px-5 py-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-900">{c.title}</p>
                  <p className="text-xs text-zinc-500 capitalize">
                    {c.status} · {c.jurisdiction || '—'} · {new Date(c.created_at).toLocaleString()}
                  </p>
                </div>
                <Link to="/app/cases" className="text-sm text-zinc-700 font-medium hover:text-zinc-900">
                  Open in case center
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </PageScaffold>
  )
}
