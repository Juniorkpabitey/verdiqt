import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export default function HeroSection() {
  return (
    <section
      id="top"
      aria-labelledby="hero-heading"
      className="relative overflow-hidden border-b border-zinc-200/80 bg-[#fafafa] pb-16 pt-10 sm:pb-20 sm:pt-14 lg:pb-24 lg:pt-16"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] bg-[size:48px_48px] opacity-[0.35] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,#000_55%,transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
            AI-assisted · Criminal justice focus
          </p>
          <h1
            id="hero-heading"
            className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-zinc-900 sm:text-5xl lg:text-[3rem]"
          >
            AI-powered legal assistance for smarter justice
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-600">
            Structured case analysis, practical legal guidance, and access to lawyers—designed for
            clarity, security, and professional oversight.
          </p>
          <ul className="mt-8 flex flex-col gap-2.5 text-sm text-zinc-600 sm:flex-row sm:flex-wrap sm:gap-x-8">
            {['Case analysis', 'Legal guidance', 'Access to lawyers'].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-zinc-400" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
            >
              Get started
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              Try free
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="relative lg:justify-self-end"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="rounded-xl border border-zinc-200/90 bg-white p-1 shadow-sm">
            <div className="overflow-hidden rounded-[10px] border border-zinc-100 bg-zinc-50/50 p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Workspace preview
                </span>
                <span className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                  Insights
                </span>
              </div>
              <div className="space-y-3">
                <div className="h-2 w-3/4 rounded bg-zinc-200/90" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-16 rounded-lg border border-zinc-200 bg-white shadow-sm" />
                  <div className="h-16 rounded-lg border border-zinc-200/80 bg-zinc-100/80" />
                  <div className="h-16 rounded-lg border border-zinc-200/80 bg-zinc-100/80" />
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-zinc-700">Analysis summary</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    Timelines, evidence notes, and suggested next steps—always reviewed with your
                    counsel.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <span className="h-2 flex-1 rounded bg-zinc-100" />
                    <span className="h-2 w-12 rounded bg-zinc-300" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-10 flex-1 rounded-lg border border-zinc-200 bg-white" />
                  <div className="h-10 w-24 rounded-lg bg-zinc-900/90" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
