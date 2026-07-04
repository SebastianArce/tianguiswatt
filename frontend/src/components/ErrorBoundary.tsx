import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean }

/** Catches render-time errors so a component bug shows a fallback, not a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Render error:', error)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="max-w-sm text-center">
          <div className="font-mono text-[10px] tracking-[0.14em] text-muted uppercase">
            Something went wrong
          </div>
          <h2 className="mt-2 font-display text-2xl text-ink">This view hit an error</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate">
            An unexpected error occurred while rendering this page.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-ink px-4 py-2 font-mono text-xs text-paper"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
