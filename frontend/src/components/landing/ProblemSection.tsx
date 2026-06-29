import { motion } from 'framer-motion'
import { AlertCircle, Scale } from 'lucide-react'
import SectionHeading from './SectionHeading'

const challenges = [
  {
    title: 'Limited access to legal support',
    body: 'Many people face proceedings without timely advice or a clear picture of their rights.',
  },
  {
    title: 'Complexity of criminal cases',
    body: 'Evidence, procedure, and timelines are hard to navigate without structured tools.',
  },
  {
    title: 'High legal costs',
    body: 'Traditional engagement models leave individuals and overstretched courts under pressure.',
  },
] as const

export default function ProblemSection() {
  return (
    <section
      id="problem"
      aria-labelledby="problem-heading"
      className="scroll-mt-24 border-b border-zinc-200/80 bg-white py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="The challenge"
          titleId="problem-heading"
          title="Justice works better when information is clear and support is within reach"
          description="Verdiqt bridges the gap between complex criminal matters and the people navigating them—so professionals can focus on strategy, not paperwork alone."
        />

        <div className="grid gap-5 lg:grid-cols-3">
          {challenges.map((c, i) => (
            <motion.article
              key={c.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="rounded-xl border border-zinc-200/90 bg-[#fafafa] p-6 transition hover:border-zinc-300 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700">
                <AlertCircle className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-zinc-900">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{c.body}</p>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="mt-10 flex flex-col gap-4 rounded-xl border border-zinc-200 bg-zinc-900 px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-10"
        >
          <div className="flex gap-4">
            <Scale className="h-9 w-9 shrink-0 text-zinc-300" aria-hidden />
            <div>
              <p className="text-lg font-semibold text-white">Our answer</p>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-400">
                A secure workspace that combines AI-assisted analysis with human oversight—so
                outcomes stay explainable, ethical, and aligned with professional duty.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
