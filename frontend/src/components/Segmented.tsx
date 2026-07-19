/** The house segmented control: a row of mono-labelled options, one active. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-md border border-line bg-paper p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded px-3 py-1 font-mono text-xs transition-colors ${
            value === o.value ? 'bg-ink text-paper' : 'text-slate hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
