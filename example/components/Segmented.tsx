const Segmented = <T extends string | boolean>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; disabled?: boolean; title?: string }[]
  value: T
  onChange: (value: T) => void
}) => (
  <div className="flex overflow-hidden rounded-md border border-zinc-700 bg-zinc-950 text-xs">
    {options.map(opt => (
      <button
        key={opt.label}
        disabled={opt.disabled}
        title={opt.title}
        onClick={() => onChange(opt.value)}
        className={`px-3 py-1.5 font-medium transition-colors ${
          value === opt.value
            ? 'bg-zinc-100 text-zinc-900'
            : opt.disabled
              ? 'cursor-not-allowed text-zinc-600'
              : 'text-zinc-300 hover:bg-zinc-800'
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
)

export default Segmented
