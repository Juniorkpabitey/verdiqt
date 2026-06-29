import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export default function FinalCtaSection() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="border-b border-zinc-200/80 bg-zinc-900 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <h2
            id="cta-heading"
            className="text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            Ready to strengthen your next case workflow?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">
            Join a modern legal workspace where AI amplifies expertise, expands access, and keeps
            professionals in control—starting with a free trial.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              to="/register"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-8 py-3 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-100 sm:w-auto"
            >
              Sign up free
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-600 bg-transparent px-8 py-3 text-sm font-medium text-white transition hover:border-zinc-500 hover:bg-white/5 sm:w-auto"
            >
              Try the workspace
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
