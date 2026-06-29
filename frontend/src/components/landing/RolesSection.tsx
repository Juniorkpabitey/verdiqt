import { motion } from 'framer-motion'
import { Gavel, LayoutDashboard, User } from 'lucide-react'
import SectionHeading from './SectionHeading'

const roles = [
  {
    icon: User,
    title: 'Individuals & defendants',
    subtitle: 'Defense support',
    points: [
      'Understand your matter with structured summaries',
      'Know your options before and between consultations',
      'Request lawyer support when representation is needed',
    ],
  },
  {
    icon: Gavel,
    title: 'Legal professionals',
    subtitle: 'Lawyers',
    points: [
      'Case management with AI-assisted triage',
      'Faster evidence review and draft scaffolding',
      'Appointment workflows that respect your time',
    ],
  },
  {
    icon: LayoutDashboard,
    title: 'Administrators',
    subtitle: 'System oversight',
    points: [
      'Usage visibility and operational control',
      'Audit trails for sensitive AI touchpoints',
      'Policies that scale across teams and jurisdictions',
    ],
  },
] as const

export default function RolesSection() {
  return (
    <section
      id="roles"
      aria-labelledby="roles-heading"
      className="scroll-mt-24 border-b border-zinc-200/80 bg-white py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Role-based experience"
          titleId="roles-heading"
          title="One platform, tailored outcomes"
          description="Verdiqt adapts to how you work—whether you are seeking help, providing it, or governing it."
          align="center"
        />

        <div className="grid gap-5 lg:grid-cols-3">
          {roles.map(({ icon: Icon, title, subtitle, points }, i) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="flex flex-col rounded-xl border border-zinc-200/90 bg-[#fafafa] p-6 transition hover:border-zinc-300 hover:shadow-sm md:p-8"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-800 shadow-sm">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {subtitle}
                  </p>
                  <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
                </div>
              </div>
              <ul className="mt-6 flex flex-1 flex-col gap-2.5 text-sm text-zinc-600">
                {points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-400" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
