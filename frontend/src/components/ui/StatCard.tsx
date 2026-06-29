import type { ReactNode } from 'react'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string | number
  hint?: string
}

export function StatCard({ icon, label, value, hint }: StatCardProps) {
  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-start gap-4">
      <div className="p-3 rounded-xl bg-zinc-100 text-zinc-800">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        <p className="text-2xl font-semibold text-zinc-900 mt-1">{value}</p>
        {hint ? <p className="text-sm text-zinc-500 mt-1">{hint}</p> : null}
      </div>
    </div>
  )
}
