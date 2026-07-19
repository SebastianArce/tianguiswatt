import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ConnectionBanner } from '@/components/ConnectionBanner'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useLiveUpdates } from '@/hooks/useLiveUpdates'
import { useTheme } from '@/hooks/useTheme'

const NAV = [
  { to: '/', label: 'Story', end: true },
  { to: '/live', label: 'Live grid' },
  { to: '/battery', label: 'Battery Lab' },
  { to: '/bid-stack', label: 'Bid stack' },
  { to: '/trends', label: 'Trends' },
  { to: '/explore', label: 'Explore' },
  { to: '/learn', label: 'Learn' },
]

const REPO_URL = 'https://github.com/SebastianArce/tianguiswatt'

const TITLES: Record<string, string> = {
  '/': 'TianguisWatt — the GB grid, and the power station hiding in people\'s homes',
  '/live': 'Live grid · TianguisWatt',
  '/battery': 'Battery Lab · TianguisWatt',
  '/bid-stack': 'Bid stack · TianguisWatt',
  '/trends': 'Trends · TianguisWatt',
  '/explore': 'Explore · TianguisWatt',
  '/learn': 'Learn · TianguisWatt',
}

/** Link to the open-source repo — the project is a portfolio piece. */
function GitHubLink() {
  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View source on GitHub"
      title="View source on GitHub"
      className="rounded-md p-2 text-slate transition-colors hover:bg-ink/5 hover:text-ink"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.13-.31-.54-1.53.12-3.19 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.19.77.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22 0 1.61-.01 2.9-.01 3.29 0 .32.22.7.83.58C20.56 22.29 24 17.8 24 12.5 24 5.87 18.63.5 12 .5z" />
      </svg>
    </a>
  )
}

/** Light/dark toggle — a sun in dark mode, a moon in light. */
function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={dark}
      className="rounded-md p-2 text-slate transition-colors hover:bg-ink/5 hover:text-ink"
    >
      {dark ? (
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <circle cx="10" cy="10" r="3.4" />
          <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4.05 4.05l1.4 1.4M14.55 14.55l1.4 1.4M15.95 4.05l-1.4 1.4M5.45 14.55l-1.4 1.4" />
        </svg>
      ) : (
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16.5 11.8A6.5 6.5 0 1 1 8.2 3.5a5 5 0 1 0 8.3 8.3z" />
        </svg>
      )}
    </button>
  )
}

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

  useEffect(() => {
    document.title = TITLES[location.pathname] ?? 'TianguisWatt'
  }, [location.pathname])

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

          <div className="flex items-center gap-1">
            {/* desktop nav */}
            <nav className="hidden gap-1 md:flex">
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

            <GitHubLink />
            <ThemeToggle />

            {/* mobile menu button */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className="-mr-2 rounded-md p-2 text-ink hover:bg-ink/5 md:hidden"
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
        </div>
      </header>

      {/* mobile slide-out drawer (kept mounted for the transition) */}
      <div
        className={`fixed inset-0 z-50 overflow-hidden md:hidden ${menuOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          aria-label="Close menu"
          tabIndex={menuOpen ? 0 : -1}
          onClick={() => setMenuOpen(false)}
          className={`absolute inset-0 h-full w-full bg-black/40 transition-opacity ${
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

      {/* keyed by route so navigating away recovers from a page error; the width
          cage lives in ContainedLayout so a route can opt into full-bleed */}
      <ErrorBoundary key={location.pathname}>
        <Outlet />
      </ErrorBoundary>
    </div>
  )
}
