/** The honesty block: what the fleet multiplication deliberately simplifies. */
export function AssumptionsNote() {
  return (
    <aside className="rounded-[10px] border border-line bg-mist p-5">
      <div className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
        Stated assumptions
      </div>
      <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate">
        <li>
          <span className="font-semibold text-ink">Identical homes.</span> Every home in
          the fleet is the same backtested household — no diversity in demand, tariff,
          or battery state.
        </li>
        <li>
          <span className="font-semibold text-ink">No network constraints.</span> The
          multiplication ignores local grid limits on simultaneous charging and
          discharging.
        </li>
        <li>
          <span className="font-semibold text-ink">Price-taker.</span> The fleet is
          assumed too small to move the prices it trades against — visibly false at the
          top of the slider. These assumptions break exactly at the scale where
          operating a virtual power plant becomes a trading problem. That is the point.
        </li>
      </ul>
    </aside>
  )
}
