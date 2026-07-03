import { NavLink, Outlet } from 'react-router-dom'
import { useLiveUpdates } from '@/hooks/useLiveUpdates'

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/explore', label: 'Explore' },
  { to: '/learn', label: 'Learn' },
]

export function RootLayout() {
  useLiveUpdates() // one SSE subscription for the whole app

  return (
    <div className="min-h-screen bg-mist text-ink">
      <header className="border-b border-line bg-paper/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-xl text-ink">TianguisWatt</span>
            <span className="font-mono text-[10px] tracking-[0.14em] text-teal uppercase">
              GB electricity market
            </span>
          </div>
          <nav className="flex gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-ink text-paper'
                      : 'text-slate hover:bg-ink/5 hover:text-ink'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
