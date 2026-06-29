import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FolderOpen, MessageSquare, Brain } from 'lucide-react'

const items = [
  { to: '/app', end: true, icon: LayoutDashboard, label: 'Home' },
  { to: '/app/cases', icon: FolderOpen, label: 'Cases' },
  { to: '/app/reviews', icon: Brain, label: 'Reviews' },
  { to: '/app/chat', icon: MessageSquare, label: 'Chat' },
]

export default function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur safe-area-pb">
      <div className="flex justify-around py-2">
        {items.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-medium ${
                isActive ? 'text-zinc-900' : 'text-zinc-500'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
