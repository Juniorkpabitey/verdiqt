import { motion } from 'framer-motion'
import {
  Brain,
  CalendarDays,
  FileText,
  MessageSquare,
  ScanSearch,
  Upload,
  Users,
} from 'lucide-react'
import SectionHeading from './SectionHeading'

const features = [
  {
    icon: Upload,
    title: 'Case submission & AI analysis',
    body: 'Upload case details and receive structured insights to inform your next steps.',
  },
  {
    icon: ScanSearch,
    title: 'Evidence analysis',
    body: 'Evaluate documents and surface inconsistencies with transparent, reviewable outputs.',
  },
  {
    icon: MessageSquare,
    title: 'AI legal assistant',
    body: 'Ask questions about procedure and rights awareness—with clear limits and human oversight.',
  },
  {
    icon: FileText,
    title: 'Legal document generation',
    body: 'Draft case files and defense-oriented documents from vetted templates.',
  },
  {
    icon: Users,
    title: 'Lawyer interaction',
    body: 'Request and connect with legal professionals when you need hands-on representation.',
  },
  {
    icon: CalendarDays,
    title: 'Appointment scheduling',
    body: 'Book consultations without friction so advice arrives when it matters.',
  },
] as const

export default function FeaturesSection() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="scroll-mt-24 border-b border-zinc-200/80 bg-[#fafafa] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Platform capabilities"
          titleId="features-heading"
          title="Everything you need to move from confusion to clarity"
          description="Purpose-built modules for criminal case workflows—designed for individuals seeking support, lawyers managing caseloads, and teams that need oversight."
          align="center"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }, i) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="group rounded-xl border border-zinc-200/90 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-px hover:border-zinc-300 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-800 transition group-hover:bg-white">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-zinc-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{body}</p>
            </motion.article>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mx-auto mt-10 flex max-w-2xl items-start justify-center gap-3 rounded-lg border border-zinc-200 bg-white px-5 py-4 text-center text-sm text-zinc-600"
        >
          <Brain className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" aria-hidden />
          <span>
            AI assists professionals—it does not replace judgment. Outputs are designed for review,
            citation, and accountability.
          </span>
        </motion.p>
      </div>
    </section>
  )
}
