import { motion } from 'framer-motion'
import { Building2, Cpu, Video } from 'lucide-react'
import SectionHeading from './SectionHeading'

const roadmap = [
  {
    icon: Video,
    title: 'Video evidence analysis',
    body: 'Richer review of hearings and recordings with time-stamped, searchable context.',
  },
  {
    icon: Cpu,
    title: 'Advanced AI predictions',
    body: 'Scenario planning and research acceleration—always paired with professional validation.',
  },
  {
    icon: Building2,
    title: 'Judicial integration',
    body: 'Deeper interoperability with court systems and administrative workflows where permitted.',
  },
] as const

export default function FutureVisionSection() {
  return (
    <section
      id="vision"
      aria-labelledby="vision-heading"
      className="scroll-mt-24 border-b border-zinc-200/80 bg-white py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Future vision"
          titleId="vision-heading"
          title="What we are building next"
          description="Our roadmap focuses on deeper evidence intelligence, safer predictive tooling, and responsible integration with public institutions."
          align="center"
        />

        <div className="grid gap-5 md:grid-cols-3">
          {roadmap.map(({ icon: Icon, title, body }, i) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="rounded-xl border border-zinc-200/90 bg-[#fafafa] p-6 transition hover:border-zinc-300"
            >
              <Icon className="h-8 w-8 text-zinc-700" aria-hidden />
              <h3 className="mt-4 text-lg font-semibold text-zinc-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
