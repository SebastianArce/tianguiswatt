import { useEffect, useState } from 'react'
import { useSnapshot } from '@/hooks/api'

const FRESH = '#3f8d84' // green — pipeline up to date
const STALE = '#c98a2b' // amber — data older than expected
const STALE_AFTER_S = 30 * 60 // the pipeline runs ~every 15 min

/** Parse the API's naive-UTC timestamp (no offset) as UTC, not browser-local. */
function parseUtc(iso: string): number {
  const hasZone = /[Z+]|-\d\d:\d\d$/.test(iso.slice(10))
  return new Date(hasZone ? iso : `${iso}Z`).getTime()
}

function relativeAge(ms: number): { label: string; stale: boolean } {
  const secs = Math.max(0, Math.round((Date.now() - ms) / 1000))
  const stale = secs > STALE_AFTER_S
  if (secs < 60) return { label: 'just now', stale }
  const mins = Math.round(secs / 60)
  if (mins < 60) return { label: `${mins}m ago`, stale }
  return { label: `${Math.round(mins / 60)}h ago`, stale }
}

/** "updated 2m ago" freshness badge; turns amber when the data goes stale. */
export function LiveIndicator() {
  const { data } = useSnapshot()
  const [, setTick] = useState(0)

  // re-render every 30s so the relative age stays current between refetches
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const measured = data?.measured_at
  if (!measured) {
    return <span className="font-mono text-[11px] text-muted">connecting…</span>
  }

  const { label, stale } = relativeAge(parseUtc(measured))
  const color = stale ? STALE : FRESH
  return (
    <span
      className="flex items-center gap-2 font-mono text-[11px] whitespace-nowrap"
      style={{ color }}
      title={`Latest data: ${measured.replace('T', ' ')} UTC`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      updated {label}
    </span>
  )
}
