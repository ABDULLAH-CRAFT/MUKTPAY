import axios from 'axios';

export type ErrorKind = 'network' | 'auth' | 'client' | 'server' | 'unknown';

/**
 * network = no response at all (offline, DNS, TLS, timeout)
 * auth    = 401 (the server definitively rejected our credentials)
 * client  = any other 4xx (bad input, not found, rate-limited...)
 * server  = 5xx
 */
export function classifyError(error: unknown): ErrorKind {
  if (!axios.isAxiosError(error)) return 'unknown';
  if (error.code === 'ERR_CANCELED') return 'unknown';

  const status = error.response?.status;
  if (status === undefined) return 'network';
  if (status === 401) return 'auth';
  if (status >= 500) return 'server';
  if (status >= 400) return 'client';
  return 'unknown';
}

export const isNetworkError = (error: unknown) => classifyError(error) === 'network';
export const isAuthError = (error: unknown) => classifyError(error) === 'auth';