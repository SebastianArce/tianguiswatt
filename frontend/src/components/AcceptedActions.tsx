import { useAcceptedActions } from '@/hooks/api'

const UP = '#3f8d84'
const DOWN = '#b4562f'

export function AcceptedActions() {
  const { data } = useAcceptedActions()
  const actions = (data ?? []).slice(0, 6)

  return (
    <section className="rounded-[10px] border border-line bg-paper p-5 shadow-sm">
      <h2 className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
        Actions accepted
      </h2>
      <ul className="mt-3 space-y-2">
        {actions.length === 0 && (
          <li className="text-xs text-muted">No recent actions.</li>
        )}
        {actions.map((a, i) => {
          const up = a.level_to >= 0
          return (
            <li
              key={`${a.national_grid_bm_unit}-${a.acceptance_time}-${i}`}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="text-sm text-ink">
                {a.national_grid_bm_unit}
                {a.so_flag && (
                  <span className="ml-1.5 rounded bg-mist px-1 py-px font-mono text-[9px] text-muted">
                    SO
                  </span>
                )}
              </span>
              <span
                className="font-mono text-sm whitespace-nowrap"
                style={{ color: up ? UP : DOWN }}
              >
                {up ? '+' : '−'}
                {Math.abs(a.level_to).toFixed(0)} MW
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
