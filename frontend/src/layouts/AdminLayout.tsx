import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Users, FolderOpen, ScrollText, Scale, LogOut, Shield, Plug } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const link =
  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors'

const tabs = [
  { to: '/admin', end: true, icon: LayoutDashboard, label: 'Overview' },
  { to: '/admin/users', end: false, icon: Users, label: 'Users' },
  { to: '/admin/cases', end: false, icon: FolderOpen, label: 'Cases' },
  { to: '/admin/governance', end: false, icon: Shield, label: 'Governance' },
  { to: '/admin/integrations', end: false, icon: Plug, label: 'Integrations' },
  { to: '/admin/logs', end: false, icon: ScrollText, label: 'Logs' },
] as const

export default function AdminLayout() {
  const { logout, user } = useAuth()

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col md:flex-row">
      <aside className="w-64 shrink-0 border-r border-zinc-200 bg-white hidden md:flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-zinc-100 flex items-center gap-2">
          <div className="p-2 rounded-lg bg-zinc-900 text-white">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-zinc-900">Admin</p>
            <p className="text-xs text-zinc-500">Verdiqt</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {tabs.map(({ to, end, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `${link} ${
                  isActive
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-zinc-100 space-y-2">
          <div className="px-3 py-2 text-xs text-zinc-600 truncate">{user?.email}</div>
          <NavLink
            to="/app"
            className={`${link} text-zinc-600 hover:bg-zinc-100`}
          >
            ← Back to app
          </NavLink>
          <button
            type="button"
            onClick={logout}
            className={`${link} w-full text-left text-zinc-600 hover:bg-zinc-100`}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <nav className="md:hidden border-b border-zinc-200 bg-white px-2 py-2 flex gap-1 overflow-x-auto">
          {tabs.map(({ to, end, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `shrink-0 px-3 py-2 rounded-lg text-xs font-semibold ${
                  isActive ? 'bg-zinc-900 text-white' : 'text-zinc-600 bg-zinc-50'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <Outlet />
      </div>
    </div>
  )
}
