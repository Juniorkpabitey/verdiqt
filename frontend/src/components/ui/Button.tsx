import React from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

const styles: Record<Variant, string> = {
  primary:
    'bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm disabled:opacity-50',
  secondary:
    'bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50',
  ghost: 'text-zinc-700 hover:bg-zinc-100 disabled:opacity-50',
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
