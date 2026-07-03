import type { ReactNode } from 'react'

export function Card({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-[10px] border border-line bg-paper p-5 shadow-sm">
      <h2 className="font-display text-lg leading-tight text-ink">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-slate">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}
