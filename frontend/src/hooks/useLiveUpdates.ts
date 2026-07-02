import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

/** Subscribe to the SSE stream and refetch queries when new data lands. */
export function useLiveUpdates() {
  const queryClient = useQueryClient()
  useEffect(() => {
    const base = import.meta.env.VITE_API_URL ?? ''
    const source = new EventSource(`${base}/api/events`)
    source.addEventListener('update', () => {
      void queryClient.invalidateQueries()
    })
    return () => source.close()
  }, [queryClient])
}
