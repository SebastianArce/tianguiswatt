export function TrendsPage() {
  return (
    <div>
      <header className="mb-6 max-w-2xl">
        <div className="font-mono text-[10px] tracking-[0.14em] text-teal uppercase">
          GB market · analysis
        </div>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink">
          Market trends
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate">
          How demand, generation, price and carbon typically behave — across the day (half-hour by
          half-hour) and across the week — aggregated in ClickHouse from months of history.
        </p>
      </header>

      <div className="flex min-h-[280px] items-center justify-center rounded-[10px] border border-dashed border-line bg-paper p-8">
        <div className="max-w-sm text-center">
          <div className="font-mono text-xs tracking-[0.12em] text-muted uppercase">
            Coming soon
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate">
            Percentile bands and day×hour patterns that reveal the shape of the market — not
            just the latest reading.
          </p>
        </div>
      </div>
    </div>
  )
}
