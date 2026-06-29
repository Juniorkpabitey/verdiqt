import { motion } from 'framer-motion'
import { Lock, Scale, ShieldCheck, Zap } from 'lucide-react'
import SectionHeading from './SectionHeading'

const pillars = [
  {
    icon: Zap,
    title: 'Accuracy & efficiency',
    body: 'Models are tuned for legal workflows with human review checkpoints—not autopilot decisions.',
  },
  {
    icon: Lock,
    title: 'Privacy & security',
    body: 'Data handling is designed for sensitive matters, with access controls and audit-friendly logs.',
  },
  {
    icon: Scale,
    title: 'Ethical AI',
    body: 'We emphasize bias awareness, source transparency, and clear limitations in every module.',
  },
  {
    icon: ShieldCheck,
    title: 'Professional alignment',
    body: 'Outputs support counsel and courts—never a substitute for regulated legal advice.',
  },
] as const

export default function TrustSection() {
  return (
    <section
      id="trust"
      aria-labelledby="trust-heading"
      className="scroll-mt-24 border-b border-zinc-200/80 bg-[#fafafa] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Trust & credibility"
          titleId="trust-heading"
          title="Responsible technology for high-stakes decisions"
          description="We combine innovation with the safeguards the justice sector expects—security, ethics, and accountability by design."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {pillars.map(({ icon: Icon, title, body }, i) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="flex gap-4 rounded-xl border border-zinc-200/90 bg-white p-6 transition hover:border-zinc-300"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-800">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{body}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
