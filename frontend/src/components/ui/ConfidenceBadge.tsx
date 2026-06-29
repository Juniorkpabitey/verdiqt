export default function ConfidenceBadge({ value }: { value?: number | null }) {
  if (value == null) return null
  const pct = Math.round(value * 100)
  const tone =
    value >= 0.8 ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
    value >= 0.55 ? 'bg-amber-50 text-amber-800 border-amber-100' :
    'bg-red-50 text-red-800 border-red-100'
  return (
    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded border ${tone}`}>
      Confidence {pct}% · Review required
    </span>
  )
}
