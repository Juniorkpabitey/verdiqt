import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, Scale, X } from 'lucide-react'

const navLinks = [
  { href: '#problem', label: 'Why Verdiqt' },
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#roles', label: 'For you' },
] as const

export default function LandingNavbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a
          href="#top"
          className="flex items-center gap-2.5 text-zinc-900 transition-opacity hover:opacity-80"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50">
            <Scale className="h-4 w-4 text-zinc-800" aria-hidden />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Verdiqt</span>
        </a>

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
          {navLinks.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            to="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
          >
            Get started
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex rounded-lg p-2 text-zinc-700 md:hidden"
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-zinc-200 bg-white px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-0.5" aria-label="Mobile primary">
            {navLinks.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                onClick={() => setOpen(false)}
              >
                {label}
              </a>
            ))}
            <Link
              to="/login"
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              onClick={() => setOpen(false)}
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="mt-1 rounded-lg bg-zinc-900 py-2.5 text-center text-sm font-medium text-white"
              onClick={() => setOpen(false)}
            >
              Get started
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
