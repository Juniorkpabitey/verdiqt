import { useEffect, useState } from 'react'
import PageScaffold from '../../components/layout/PageScaffold'
import AiDisclaimer from '../../components/ui/AiDisclaimer'
import { getErrorMessage } from '../../lib/errors'
import { getGovernanceStats, listGovernanceIncidents } from '../../lib/services/governance'
import { StatCard } from '../../components/ui/StatCard'
import { Shield, AlertTriangle, Activity } from 'lucide-react'

export default function MonitorDashboardPage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getGovernanceStats>> | null>(null)
  const [incidents, setIncidents] = useState<Awaited<ReturnType<typeof listGovernanceIncidents>>>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [s, i] = await Promise.all([getGovernanceStats(), listGovernanceIncidents()])
        if (!cancelled) {
          setStats(s)
          setIncidents(i)
        }
      } catch (e) {
        if (!cancelled) setErr(getErrorMessage(e))
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <PageScaffold title="Human rights monitor" subtitle="Read-only governance and transparency view.">
      <AiDisclaimer />
      {err ? <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</p> : null}

      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        <StatCard label="Open incidents" value={stats?.openIncidents ?? '—'} icon={<AlertTriangle className="w-5 h-5" />} />
        <StatCard label="Pending reviews" value={stats?.pendingReviews ?? '—'} icon={<Shield className="w-5 h-5" />} />
        <StatCard label="AI interactions" value={stats?.totalAiInteractions ?? '—'} icon={<Activity className="w-5 h-5" />} />
      </div>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="font-semibold text-zinc-900 mb-3">Recent incidents</h2>
        <ul className="space-y-2 text-sm">
          {incidents.slice(0, 20).map((i) => (
            <li key={i.id} className="border border-zinc-100 rounded-lg p-3">
              <p className="font-medium capitalize">{i.incident_type} · {i.severity}</p>
              <p className="text-zinc-600">{i.description}</p>
            </li>
          ))}
          {incidents.length === 0 ? <li className="text-zinc-500">No incidents.</li> : null}
        </ul>
      </section>
    </PageScaffold>
  )
}
