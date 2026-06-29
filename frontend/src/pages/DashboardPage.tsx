import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen, MessageSquare, FileText, ArrowRight } from 'lucide-react'
import PageScaffold from '../components/layout/PageScaffold'
import { StatCard } from '../components/ui/StatCard'
import { getErrorMessage } from '../lib/errors'
import { listCases } from '../lib/services/cases'
import { useAuth } from '../context/AuthContext'

type CaseRow = {
  id: string
  title: string
  status: string
  created_at: string
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [cases, setCases] = useState<CaseRow[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await listCases()
        if (!cancelled) setCases(data)
      } catch (e) {
        if (!cancelled) setErr(getErrorMessage(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const analyzed = cases.filter((c) => c.status === 'analyzed').length

  return (
    <PageScaffold
      title="Dashboard"
      subtitle="Overview of your matters and quick paths into core tools."
    >
      {err ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {err}
        </p>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total cases"
          value={cases.length}
          hint="Stored in your workspace"
          icon={<FolderOpen className="w-5 h-5" />}
        />
        <StatCard
          label="Analyzed"
          value={analyzed}
          hint="Cases with AI output"
          icon={<MessageSquare className="w-5 h-5" />}
        />
        <StatCard
          label="Modules"
          value={3}
          hint="Cases, chat, documents"
          icon={<FileText className="w-5 h-5" />}
        />
        <StatCard
          label="Free trial credits"
          value={user?.trial_credits ?? '—'}
          hint="Consumed by analysis and chat"
          icon={<MessageSquare className="w-5 h-5" />}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          {
            to: '/app/cases',
            title: 'Submit & analyze a case',
            body: 'Capture facts, run AI analysis, and keep outcomes on the record.',
            icon: FolderOpen,
          },
          {
            to: '/app/chat',
            title: 'Open the AI assistant',
            body: 'Ask questions grounded on your knowledge base configuration.',
            icon: MessageSquare,
          },
          {
            to: '/app/documents',
            title: 'Generate a legal draft',
            body: 'Produce bail applications and motions from structured inputs.',
            icon: FileText,
          },
        ].map(({ to, title, body, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm hover:border-zinc-300 hover:shadow transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="p-2 rounded-lg bg-zinc-100 text-zinc-900">
                <Icon className="w-5 h-5" />
              </div>
              <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
            </div>
            <h2 className="mt-4 font-semibold text-zinc-900">{title}</h2>
            <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{body}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900">Recent cases</h2>
          <Link to="/app/cases" className="text-sm font-medium text-zinc-700 hover:text-zinc-900">
            View all
          </Link>
        </div>
        <ul className="divide-y divide-zinc-100">
          {cases.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-zinc-500">
              No cases yet.{' '}
              <Link to="/app/cases" className="text-zinc-900 font-medium underline-offset-2 hover:underline">
                Create your first case
              </Link>
              .
            </li>
          ) : (
            cases.slice(0, 6).map((c) => (
              <li key={c.id} className="px-5 py-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-zinc-900">{c.title}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(c.created_at).toLocaleString()} ·{' '}
                    <span className="capitalize">{c.status}</span>
                  </p>
                </div>
                <Link
                  to="/app/cases"
                  className="text-sm text-zinc-700 hover:text-zinc-900 font-medium"
                >
                  Open
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>
    </PageScaffold>
  )
}
