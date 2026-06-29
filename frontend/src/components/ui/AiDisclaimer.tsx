export default function AiDisclaimer({ className = '' }: { className?: string }) {
  return (
    <p
      className={`text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 ${className}`}
    >
      <strong>Information only — not legal advice.</strong> AI outputs are drafts requiring human
      lawyer review before any court use, filing, or client reliance.
    </p>
  )
}
