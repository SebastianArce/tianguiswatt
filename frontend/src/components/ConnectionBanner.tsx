import { useSnapshot } from '@/hooks/api'

/** A subtle banner shown when the core live-data query is failing (backend down / starting). */
export function ConnectionBanner() {
  const { isError, refetch } = useSnapshot()
  if (!isError) return null

  return (
    <div
      className="border-b border-line px-4 py-2 sm:px-6"
      style={{ backgroundColor: 'rgba(201,138,43,0.12)' }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 text-xs">
        <span className="text-ink">
          Can't reach the live data — the server may be starting up or unreachable.
        </span>
        <button
          type="button"
          onClick={() => refetch()}
          className="shrink-0 font-mono text-teal hover:underline"
        >
          Retry
        </button>
      </div>
    </div>
  )
}
