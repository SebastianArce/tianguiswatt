import { useEffect, useRef, useState } from 'react'

/** True once the element has entered the viewport; fires once and disconnects.
 *  Immediately true when IntersectionObserver is unavailable or the user prefers
 *  reduced motion — content must never be trapped invisible. */
export function useInView<T extends HTMLElement = HTMLDivElement>({
  rootMargin = '0px 0px -10% 0px',
  threshold = 0.15,
} = {}) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setInView(true)
      return
    }
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [rootMargin, threshold])

  return { ref, inView }
}
