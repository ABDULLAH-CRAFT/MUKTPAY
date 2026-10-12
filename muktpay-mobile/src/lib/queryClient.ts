import { QueryClient } from '@tanstack/react-query';
import { classifyError } from './errorKind';

const MAX_QUERY_RETRIES = 2;

/** Retry only failures that can fix themselves: no network, or a 5xx. Never 4xx. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_QUERY_RETRIES) return false;
  const kind = classifyError(error);
  return kind === 'network' || kind === 'server';
}

/** 1s, 2s, 4s... capped at 5s. */
export const retryDelay = (failureCount: number) => Math.min(1000 * 2 ** failureCount, 5000);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
      retryDelay,
      // 'always' = fail fast and show an error with a Retry button instead of waiting forever
      // while "offline". Screens then show ErrorState rather than a stuck spinner/empty list.
      networkMode: 'always',
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false, // never auto-repeat a write (create bill, mark paid, cancel...)
      networkMode: 'always',
    },
  },
});