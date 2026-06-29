import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  FileText,
  BriefcaseBusiness,
  Scale,
  LogOut,
  Brain,
  GitBranch,
  ShieldCheck,
  Eye,
  FlaskConical,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const linkBase =
  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors'
const inactive = 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
const active = 'bg-zinc-900 text-white shadow-sm'

export default function AppSidebar() {
  const { user, logout } = useAuth()

  const items = [
    { to: '/app', end: true, icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/app/cases', icon: FolderOpen, label: 'Cases & analysis' },
    { to: '/app/pathway', icon: GitBranch, label: 'Procedure pathway' },
    { to: '/app/chat', icon: MessageSquare, label: 'AI assistant' },
    { to: '/app/documents', icon: FileText, label: 'Documents' },
    { to: '/app/reviews', icon: Brain, label: 'Review queue' },
  ]

  if (user?.role === 'lawyer' || user?.role === 'admin' || user?.role === 'legal_aid') {
    items.push({ to: '/lawyer', icon: BriefcaseBusiness, label: 'Lawyer desk' })
  }
  if (user?.role === 'hr_monitor' || user?.role === 'admin') {
    items.push({ to: '/monitor', icon: Eye, label: 'HR monitor' })
  }
  if (user?.role === 'researcher' || user?.role === 'admin') {
    items.push({ to: '/research', icon: FlaskConical, label: 'Research' })
  }
  if (user?.role === 'admin') {
    items.push({ to: '/admin/governance', icon: ShieldCheck, label: 'Governance' })
  }

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-white h-screen sticky top-0">
      <div className="p-6 flex items-center gap-2 border-b border-zinc-100">
        <div className="p-2 rounded-lg bg-zinc-900 text-white">
          <Scale className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold text-zinc-900 leading-tight">Verdiqt</p>
          <p className="text-xs text-zinc-500">Justice intelligence</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-zinc-100 space-y-2">
        <div className="px-3 py-2 rounded-lg bg-zinc-50 text-xs text-zinc-600">
          <p className="font-medium text-zinc-900 truncate">{user?.full_name || user?.email}</p>
          <p className="truncate text-zinc-500 capitalize">{user?.role?.replace('_', ' ')}</p>
        </div>
        <button type="button" onClick={logout} className={`${linkBase} w-full ${inactive} text-left`}>
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
