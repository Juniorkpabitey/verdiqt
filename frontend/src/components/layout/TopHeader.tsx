import { Bell, Menu } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

type Props = {
  title: string
  subtitle?: string
  onMenuClick?: () => void
}

export default function TopHeader({ title, subtitle, onMenuClick }: Props) {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg border border-zinc-200 text-zinc-700"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-zinc-900 truncate">{title}</h1>
            {subtitle ? (
              <p className="text-sm text-zinc-500 truncate hidden sm:block">{subtitle}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {user?.role === 'admin' ? (
            <Link
              to="/admin"
              className="hidden sm:inline-flex text-sm font-medium text-zinc-700 hover:text-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50"
            >
              Admin
            </Link>
          ) : null}
          {user?.role === 'lawyer' ? (
            <Link
              to="/lawyer"
              className="hidden sm:inline-flex text-sm font-medium text-zinc-700 hover:text-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50"
            >
              Lawyer
            </Link>
          ) : null}
          <button
            type="button"
            className="relative p-2 rounded-full border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-zinc-900" />
          </button>
        </div>
      </div>
    </header>
  )
}
