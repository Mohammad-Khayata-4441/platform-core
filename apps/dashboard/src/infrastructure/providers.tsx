'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from '@core/ui/shadcn/sonner';
import { ApiProvider } from '@core/api-client/react';
import { api } from '@/lib/api';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <ApiProvider api={api}>{children}</ApiProvider>
        <Toaster />
      </NuqsAdapter>
    </QueryClientProvider>
  );
}
