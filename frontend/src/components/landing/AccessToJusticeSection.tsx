import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Gift, HeartHandshake } from 'lucide-react'
import SectionHeading from './SectionHeading'

export default function AccessToJusticeSection() {
  return (
    <section
      id="access"
      aria-labelledby="access-heading"
      className="scroll-mt-24 border-b border-zinc-200/80 bg-zinc-100/60 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Access to justice"
          titleId="access-heading"
          title="Fairer legal opportunity starts with lowering the first barrier"
          description="We prioritize pathways for underserved individuals—free trial access, clearer explanations, and tools that help you advocate for yourself alongside professionals."
          align="center"
        />

        <div className="grid gap-5 lg:grid-cols-2">
          <motion.article
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="rounded-xl border border-zinc-200/90 bg-white p-8 shadow-sm"
          >
            <Gift className="h-9 w-9 text-zinc-700" aria-hidden />
            <h3 className="mt-5 text-xl font-semibold text-zinc-900">Try free, then scale</h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              Start with trial credits to explore analysis, assistant chat, and document flows.
              Upgrade when you are ready for deeper collaboration with counsel.
            </p>
            <Link
              to="/register"
              className="mt-6 inline-flex rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Start free trial
            </Link>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.06 }}
            className="rounded-xl border border-zinc-200/90 bg-white p-8 shadow-sm"
          >
            <HeartHandshake className="h-9 w-9 text-zinc-700" aria-hidden />
            <h3 className="mt-5 text-xl font-semibold text-zinc-900">Built for real-world equity</h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              Language clarity, procedural context, and respectful design help more people participate
              meaningfully—without replacing the vital role of qualified legal professionals.
            </p>
          </motion.article>
        </div>
      </div>
    </section>
  )
}
