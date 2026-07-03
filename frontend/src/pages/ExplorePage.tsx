export function ExplorePage() {
  return (
    <section className="max-w-2xl">
      <div className="font-mono text-[10px] tracking-[0.14em] text-teal uppercase">
        Explore
      </div>
      <h1 className="mt-2 font-display text-3xl leading-tight text-ink">
        Merit-order bid stack
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate">
        A live, interactive merit order built from real Elexon balancing-mechanism bids —
        drag demand across the stack to see which unit sets the price. Coming next.
      </p>
    </section>
  )
}
