import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
}

export function renderWithQuery(ui: ReactElement, options?: RenderOptions) {
  const qc = createTestQueryClient()
  return render(
    <QueryClientProvider client={qc}>{ui}</QueryClientProvider>,
    options,
  )
}
