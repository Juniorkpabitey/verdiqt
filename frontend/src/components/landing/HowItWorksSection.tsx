import { motion } from 'framer-motion'
import { UserPlus, Upload, Cpu, Handshake, FileCheck } from 'lucide-react'
import SectionHeading from './SectionHeading'

const steps = [
  {
    step: 1,
    title: 'Sign up / Log in',
    body: 'Create your account and choose your role so the workspace fits your journey.',
    icon: UserPlus,
  },
  {
    step: 2,
    title: 'Upload case or evidence',
    body: 'Share structured facts and documents in a secure, organized flow.',
    icon: Upload,
  },
  {
    step: 3,
    title: 'AI analyzes & generates insights',
    body: 'Receive timelines, risk notes, and summaries you can validate with counsel.',
    icon: Cpu,
  },
  {
    step: 4,
    title: 'Connect with a lawyer (optional)',
    body: 'Escalate to a professional when you need representation or a second opinion.',
    icon: Handshake,
  },
  {
    step: 5,
    title: 'Legal support & documents',
    body: 'Access guidance, drafts, and follow-ups in one auditable workspace.',
    icon: FileCheck,
  },
] as const

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="scroll-mt-24 border-b border-zinc-200/80 bg-white py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Your journey"
          titleId="how-heading"
          title="How it works"
          description="A guided path from intake to insight—whether you are defending a matter or managing many."
        />

        <ol className="relative space-y-0">
          {steps.map(({ step, title, body, icon: Icon }, i) => (
            <motion.li
              key={step}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="relative flex gap-4 pb-10 last:pb-0 md:gap-6"
            >
              {i < steps.length - 1 ? (
                <div
                  className="absolute left-[1.25rem] top-11 hidden h-[calc(100%-0.25rem)] w-px bg-zinc-200 md:block"
                  aria-hidden
                />
              ) : null}
              <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-semibold text-zinc-900 shadow-sm">
                {step}
              </div>
              <div className="min-w-0 flex-1 rounded-xl border border-zinc-200/90 bg-[#fafafa] p-5 transition hover:border-zinc-300 hover:bg-white md:flex md:items-start md:gap-5 md:p-6">
                <div className="mb-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white shadow-sm md:mb-0">
                  <Icon className="h-4 w-4 text-zinc-700" aria-hidden />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">{body}</p>
                </div>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}
