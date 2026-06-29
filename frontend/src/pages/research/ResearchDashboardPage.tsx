import { useEffect, useState } from 'react'
import PageScaffold from '../../components/layout/PageScaffold'
import { getErrorMessage } from '../../lib/errors'
import { getAnonymizedResearchMetrics, type ResearchMetrics } from '../../lib/services/enterprise'
import { StatCard } from '../../components/ui/StatCard'
import { Users, FolderOpen, Activity, GitBranch, AlertTriangle, RefreshCw } from 'lucide-react'

function MetricBlock({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data)
  if (entries.length === 0) return null
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h3 className="font-semibold text-zinc-900 mb-3">{title}</h3>
      <ul className="space-y-1 text-sm">
        {entries.map(([k, v]) => (
          <li key={k} className="flex justify-between">
            <span className="capitalize text-zinc-600">{k.replace('_', ' ')}</span>
            <span className="font-medium">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ResearchDashboardPage() {
  const [stats, setStats] = useState<ResearchMetrics | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = async () => {
    setErr(null)
    try {
      const s = await getAnonymizedResearchMetrics()
      setStats(s)
    } catch (e) {
      setErr(getErrorMessage(e))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <PageScaffold
      title="Research analytics"
      subtitle="Anonymized aggregate metrics — no case content or PII (IRB-gated exports require separate approval)."
    >
      {err ? <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</p> : null}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <StatCard label="Total users" value={stats?.total_users ?? '—'} icon={<Users className="w-5 h-5" />} />
        <StatCard label="Total cases" value={stats?.total_cases ?? '—'} icon={<FolderOpen className="w-5 h-5" />} />
        <StatCard label="AI interactions" value={stats?.total_ai_interactions ?? '—'} icon={<Activity className="w-5 h-5" />} />
        <StatCard
          label="Human override rate"
          value={stats ? `${stats.human_override_rate}%` : '—'}
          icon={<RefreshCw className="w-5 h-5" />}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        <MetricBlock title="Users by role" data={stats?.users_by_role ?? {}} />
        <MetricBlock title="Cases by stage" data={stats?.cases_by_stage ?? {}} />
        <MetricBlock title="Cases by country" data={stats?.cases_by_country ?? {}} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        <StatCard
          label="Pathway completions"
          value={stats?.pathway_completions ?? '—'}
          icon={<GitBranch className="w-5 h-5" />}
        />
        <StatCard
          label="Open governance incidents"
          value={stats?.governance_open_incidents ?? '—'}
          icon={<AlertTriangle className="w-5 h-5" />}
        />
      </div>

      {stats?.ai_reviews_by_status ? (
        <div className="mt-6">
          <MetricBlock title="AI reviews by status" data={stats.ai_reviews_by_status} />
        </div>
      ) : null}

      <p className="mt-8 text-sm text-zinc-600 rounded-xl border border-zinc-200 bg-white p-5">
        Data generated at {stats?.generated_at ? new Date(stats.generated_at).toLocaleString() : '—'}.
        Research access is read-only and aggregate. Individual case content requires separate ethics approval and data agreements.
      </p>
    </PageScaffold>
  )
}
