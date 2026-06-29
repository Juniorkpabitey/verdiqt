import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getErrorMessage } from '../../lib/errors'
import { getAdminOverview } from '../../lib/services/admin'
import { StatCard } from '../../components/ui/StatCard'
import { Users, FolderOpen, Activity, Clock } from 'lucide-react'

type Overview = {
  users: number
  cases: number
  ai_interactions_total: number
  ai_interactions_24h: number
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await getAdminOverview()
        if (!cancelled) setData(d)
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
        <h1 className="text-xl font-semibold text-zinc-900">Admin overview</h1>
        <p className="text-sm text-zinc-600 mt-1">
          System activity at a glance. Use the sidebar for users, cases, and logs.
        </p>
      </header>

      <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
        {err ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {err}
          </p>
        ) : null}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Registered users"
            value={data?.users ?? '—'}
            icon={<Users className="w-5 h-5" />}
          />
          <StatCard
            label="Cases"
            value={data?.cases ?? '—'}
            icon={<FolderOpen className="w-5 h-5" />}
          />
          <StatCard
            label="AI interactions (all time)"
            value={data?.ai_interactions_total ?? '—'}
            icon={<Activity className="w-5 h-5" />}
          />
          <StatCard
            label="AI interactions (24h)"
            value={data?.ai_interactions_24h ?? '—'}
            icon={<Clock className="w-5 h-5" />}
          />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-semibold text-zinc-900">Next steps</h2>
            <p className="text-sm text-zinc-600 mt-1">
              Review AI logs for quality, manage inactive accounts, and monitor case throughput.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/logs"
              className="inline-flex items-center justify-center rounded-xl bg-zinc-900 text-white px-4 py-2.5 text-sm font-medium hover:bg-zinc-800"
            >
              Open AI logs
            </Link>
            <Link
              to="/admin/users"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Manage users
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
