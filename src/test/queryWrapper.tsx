// QueryClient + Router wrapper para testes de hooks/pages.
// Cada teste cria seu próprio QueryClient pra evitar cache entre testes.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface ProvidersProps {
  children: ReactNode;
  initialRoute?: string;
  queryClient?: QueryClient;
}

export function TestProviders({ children, initialRoute = '/', queryClient }: ProvidersProps) {
  const client = queryClient ?? createTestQueryClient();
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialRoute]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

/** Wrapper factory pra usar com renderHook do RTL. */
export function makeHookWrapper(qc?: QueryClient) {
  const client = qc ?? createTestQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}
