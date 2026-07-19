import type { ReactNode } from 'react'
import { useInView } from '@/hooks/useInView'

/** One full-attention narrative section: eyebrow, serif title, lede, then the figure.
 *  Children may be a render-prop receiving `inView` so charts can lazy-init only when
 *  the section approaches the viewport (keeps initial paint free of ECharts). */
export function SectionShell({
  id,
  eyebrow,
  title,
  lede,
  tone = 'default',
  children,
}: {
  id: string
  eyebrow: string
  title: string
  lede: ReactNode
  tone?: 'default' | 'raised'
  children?: ReactNode | ((inView: boolean) => ReactNode)
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: '200px 0px' })
  return (
    <section id={id} className={tone === 'raised' ? 'bg-paper' : ''}>
      <div
        ref={ref}
        className={`story-reveal ${inView ? 'in-view' : ''} mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24`}
      >
        <div className="max-w-2xl">
          <div className="font-mono text-[10px] tracking-[0.14em] text-teal uppercase">
            {eyebrow}
          </div>
          <h2 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">
            {title}
          </h2>
          <div className="mt-4 text-sm leading-relaxed text-slate">{lede}</div>
        </div>
        {typeof children === 'function' ? children(inView) : children}
      </div>
    </section>
  )
}
