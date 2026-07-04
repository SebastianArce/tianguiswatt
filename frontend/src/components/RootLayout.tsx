import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ConnectionBanner } from '@/components/ConnectionBanner'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useLiveUpdates } from '@/hooks/useLiveUpdates'

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/explore', label: 'Explore' },
  { to: '/bid-stack', label: 'Bid stack' },
  { to: '/trends', label: 'Trends' },
  { to: '/learn', label: 'Learn' },
]

function linkClass(isActive: boolean, size: 'sm' | 'lg') {
  const pad = size === 'lg' ? 'px-3 py-3 text-base' : 'px-3 py-1.5 text-sm'
  return `rounded-md ${pad} transition-colors ${
    isActive ? 'bg-ink text-paper' : 'text-slate hover:bg-ink/5 hover:text-ink'
  }`
}

export function RootLayout() {
  useLiveUpdates() // one SSE subscription for the whole app
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // close the drawer whenever the route changes
  useEffect(() => setMenuOpen(false), [location.pathname])

  // while the drawer is open: close on Escape + lock background scroll
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <div className="min-h-screen bg-mist text-ink">
      <header className="border-b border-line bg-paper/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-xl text-ink">TianguisWatt</span>
            <span className="hidden font-mono text-[10px] tracking-[0.14em] text-teal uppercase sm:inline">
              GB electricity market
            </span>
          </div>

          {/* desktop nav */}
          <nav className="hidden gap-1 sm:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => linkClass(isActive, 'sm')}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          {/* mobile menu button */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="-mr-2 rounded-md p-2 text-ink hover:bg-ink/5 sm:hidden"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M3 6h14M3 10h14M3 14h14" />
            </svg>
          </button>
        </div>
      </header>

      {/* mobile slide-out drawer (kept mounted for the transition) */}
      <div
        className={`fixed inset-0 z-50 overflow-hidden sm:hidden ${menuOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          aria-label="Close menu"
          tabIndex={menuOpen ? 0 : -1}
          onClick={() => setMenuOpen(false)}
          className={`absolute inset-0 h-full w-full bg-ink/30 transition-opacity ${
            menuOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <nav
          className={`absolute top-0 right-0 flex h-full w-64 max-w-[80%] flex-col gap-1 border-l border-line bg-paper p-4 shadow-xl transition-transform duration-200 ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="mb-2 px-3 font-mono text-[10px] tracking-[0.14em] text-muted uppercase">
            Menu
          </div>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              tabIndex={menuOpen ? 0 : -1}
              className={({ isActive }) => linkClass(isActive, 'lg')}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <ConnectionBanner />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* keyed by route so navigating away recovers from a page error */}
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
