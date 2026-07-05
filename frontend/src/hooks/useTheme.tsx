import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'
type ThemeContextValue = { theme: Theme; toggle: () => void }

const ThemeContext = createContext<ThemeContextValue | null>(null)

/** Browser-chrome colour per theme (kept in sync with --color-mist / --color-paper). */
const META_COLOR: Record<Theme, string> = { light: '#f6f6f2', dark: '#0f1614' }

/** Default is light; an explicit choice is remembered. Mirrors the pre-paint script in
 *  index.html so the first render matches the class already on <html>. */
function initialTheme(): Theme {
  try {
    return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // localStorage unavailable (private mode) — the choice just won't persist.
    }
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', META_COLOR[theme])
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

// The provider and its hook are colocated by design (shared private context).
// oxlint-disable-next-line react/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
