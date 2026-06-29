import { Outlet, NavLink } from 'react-router-dom'
import { useState } from 'react'
import AppSidebar from '../components/layout/AppSidebar'
import MobileNav from '../components/layout/MobileNav'
import { useAuth } from '../context/AuthContext'

export default function AppLayout() {
  const [drawer, setDrawer] = useState(false)
  const { user } = useAuth()

  const links: { to: string; label: string; end: boolean }[] = [
    { to: '/', label: 'Marketing site', end: false },
    { to: '/app', label: 'Dashboard', end: true },
    { to: '/app/cases', label: 'Cases', end: false },
    { to: '/app/chat', label: 'AI assistant', end: false },
    { to: '/app/documents', label: 'Documents', end: false },
  ]
  if (user?.role === 'lawyer' || user?.role === 'admin') {
    links.push({ to: '/lawyer', label: 'Lawyer desk', end: false })
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 flex">
      <AppSidebar />

      {drawer ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-zinc-900/20 lg:hidden"
          aria-label="Close menu"
          onClick={() => setDrawer(false)}
        />
      ) : null}

      <div
        className={`fixed z-50 inset-y-0 left-0 w-72 bg-white border-r border-zinc-200 transform transition-transform lg:hidden ${
          drawer ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-zinc-100 font-semibold text-zinc-900">Menu</div>
        <nav className="p-3 space-y-1">
          {links.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setDrawer(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-50'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <main className="flex-1 min-w-0 flex flex-col pb-16 lg:pb-0">
        <Outlet context={{ openMenu: () => setDrawer(true) }} />
      </main>

      <MobileNav />
    </div>
  )
}
