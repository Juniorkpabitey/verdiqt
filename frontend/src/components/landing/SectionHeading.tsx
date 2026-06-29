type SectionHeadingProps = {
  eyebrow?: string
  title: string
  titleId?: string
  description?: string
  align?: 'left' | 'center'
}

export default function SectionHeading({
  eyebrow,
  title,
  titleId,
  description,
  align = 'left',
}: SectionHeadingProps) {
  const alignCls = align === 'center' ? 'text-center mx-auto' : ''
  const maxDesc = align === 'center' ? 'max-w-2xl mx-auto' : 'max-w-2xl'

  return (
    <div className={`mb-10 md:mb-14 ${alignCls}`}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{eyebrow}</p>
      ) : null}
      <h2
        id={titleId}
        className="mt-3 text-3xl font-semibold tracking-tight text-balance text-zinc-900 sm:text-4xl md:text-[2.35rem] md:leading-[1.15]"
      >
        {title}
      </h2>
      {description ? (
        <p className={`mt-4 text-base sm:text-lg leading-relaxed text-zinc-600 ${maxDesc}`}>
          {description}
        </p>
      ) : null}
    </div>
  )
}
