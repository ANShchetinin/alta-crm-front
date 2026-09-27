import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false, gcTime: 0 },
    mutations: { retry: false }
  }
});

export const createQueryWrapper = (client: QueryClient = createTestQueryClient()) => {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

export const renderWithQuery = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => {
  return render(ui, { wrapper: createQueryWrapper(), ...options });
};
