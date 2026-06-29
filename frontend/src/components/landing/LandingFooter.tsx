import { Scale } from 'lucide-react'
import { FaLinkedin, FaXTwitter, FaYoutube } from 'react-icons/fa6'

const footerLinks = [
  { href: '#top', label: 'About' },
  { href: '#features', label: 'Features' },
  { href: '#contact', label: 'Contact' },
  { href: '#privacy-policy', label: 'Privacy policy' },
] as const

const social = [
  { label: 'X (Twitter)', href: 'https://twitter.com', icon: FaXTwitter },
  { label: 'LinkedIn', href: 'https://linkedin.com', icon: FaLinkedin },
  { label: 'YouTube', href: 'https://youtube.com', icon: FaYoutube },
] as const

export default function LandingFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-zinc-200/80 bg-white text-zinc-600">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2 text-zinc-900">
              <Scale className="h-5 w-5 text-zinc-700" aria-hidden />
              <span className="text-[15px] font-semibold">Verdiqt</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed">
              AI-powered legal assistance for criminal case analysis, access to justice, and judicial
              efficiency—built with professionals in the loop.
            </p>
            <div className="mt-6 flex gap-2">
              {social.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${label} (placeholder)`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Links</p>
              <ul className="mt-4 space-y-2 text-sm">
                {footerLinks.map(({ href, label }) => (
                  <li key={href}>
                    <a href={href} className="transition hover:text-zinc-900">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div id="privacy-policy">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Legal</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <span className="text-zinc-600">
                    Privacy policy: placeholder — full policy URL can be wired when available.
                  </span>
                </li>
                <li>
                  <span className="text-zinc-400">Terms (coming soon)</span>
                </li>
              </ul>
            </div>
            <div id="contact" className="col-span-2 sm:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Contact</p>
              <p className="mt-4 text-sm leading-relaxed">
                For demos, partnerships, or press:{' '}
                <a
                  href="mailto:hello@verdiqt.com"
                  className="text-zinc-900 underline decoration-zinc-300 underline-offset-2 transition hover:decoration-zinc-900"
                >
                  hello@verdiqt.com
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-zinc-100 pt-8 text-center text-xs text-zinc-400 sm:text-left">
          © {year} Verdiqt. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
