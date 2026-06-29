import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../lib/errors'
import {
  getGovernanceStats,
  listGovernanceIncidents,
  listModelRegistry,
} from '../../lib/services/governance'
import { StatCard } from '../../components/ui/StatCard'
import { Shield, AlertTriangle, FileCheck, Activity } from 'lucide-react'

export default function AdminGovernancePage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getGovernanceStats>> | null>(null)
  const [models, setModels] = useState<Awaited<ReturnType<typeof listModelRegistry>>>([])
  const [incidents, setIncidents] = useState<Awaited<ReturnType<typeof listGovernanceIncidents>>>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [s, m, i] = await Promise.all([
          getGovernanceStats(),
          listModelRegistry(),
          listGovernanceIncidents(),
        ])
        if (!cancelled) {
          setStats(s)
          setModels(m)
          setIncidents(i)
        }
      } catch (e) {
        if (!cancelled) setErr(getErrorMessage(e))
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-4 sm:px-8 py-6">
        <h1 className="text-xl font-semibold text-zinc-900">AI governance</h1>
        <p className="text-sm text-zinc-600 mt-1">Transparency, model registry, and incident tracking.</p>
      </header>

      <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
        {err ? <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</p> : null}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Registered models" value={stats?.models ?? '—'} icon={<Shield className="w-5 h-5" />} />
          <StatCard label="Open incidents" value={stats?.openIncidents ?? '—'} icon={<AlertTriangle className="w-5 h-5" />} />
          <StatCard label="Pending AI reviews" value={stats?.pendingReviews ?? '—'} icon={<FileCheck className="w-5 h-5" />} />
          <StatCard label="AI interactions" value={stats?.totalAiInteractions ?? '—'} icon={<Activity className="w-5 h-5" />} />
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="font-semibold text-zinc-900 mb-4">Model registry</h2>
          <ul className="space-y-3 text-sm">
            {models.map((m) => (
              <li key={m.id} className="border border-zinc-100 rounded-xl p-4">
                <p className="font-medium">{m.model_key} · {m.provider} v{m.version}</p>
                <p className="text-zinc-600 mt-1"><strong>Intended:</strong> {m.intended_use}</p>
                <p className="text-red-700 mt-1"><strong>Prohibited:</strong> {m.prohibited_uses}</p>
                {m.limitations ? <p className="text-zinc-500 mt-1">{m.limitations}</p> : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="font-semibold text-zinc-900 mb-4">Governance incidents</h2>
          <ul className="space-y-2 text-sm">
            {incidents.length === 0 ? (
              <li className="text-zinc-500">No incidents reported.</li>
            ) : incidents.map((i) => (
              <li key={i.id} className="border border-zinc-100 rounded-lg p-3 flex justify-between gap-2">
                <div>
                  <p className="font-medium capitalize">{i.incident_type} · {i.severity}</p>
                  <p className="text-zinc-600">{i.description}</p>
                </div>
                <span className="text-xs text-zinc-400 capitalize">{i.status}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
