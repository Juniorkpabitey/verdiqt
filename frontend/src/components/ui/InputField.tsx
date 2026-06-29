export const InputField = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-zinc-600 ml-0.5">{label}</label>
    <input
      type={type}
      className="w-full bg-white px-3 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-sm placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition-shadow"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
)
