import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './hooks/useTheme.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // surface an outage after a single retry rather than the default three
      retry: 1,
      // freshness is push-driven: the SSE stream invalidates queries when new data
      // lands, so remounts/refocus within a minute need not refetch at all
      staleTime: 60_000,
      // when a query key changes (battery preset, metric, window…), keep showing
      // the previous result while the new one loads instead of flashing empty
      placeholderData: keepPreviousData,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
