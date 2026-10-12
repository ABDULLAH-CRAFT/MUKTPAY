import axios, { type InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from './config';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './tokenStorage';
import type { AuthResponse } from '@/types/auth';

export const API_BASE_URL = API_CONFIG.baseUrl;

const TIMEOUT_MS = 15_000;

export const api = axios.create({ baseURL: API_BASE_URL, timeout: TIMEOUT_MS });
// Interceptor-free client, used only to call /auth/refresh (avoids refresh loops).
const bare = axios.create({ baseURL: API_BASE_URL, timeout: TIMEOUT_MS });

// Called when the server definitively rejects our refresh token → AuthProvider shows login.
let onSessionExpired: (() => void) | null = null;
export const setSessionExpiredHandler = (handler: (() => void) | null) => {
  onSessionExpired = handler;
};

// Only ONE refresh runs at a time. Several requests failing with 401 together all wait on
// the same promise, because refresh tokens are single-use (a second call would look like theft).
let refreshInFlight: Promise<string | null> | null = null;

/**
 * Resolves to a new access token, or null when there is no usable session
 * (no refresh token, or the server answered 401 → session ended).
 * REJECTS on network / 5xx / 429 errors: those are not an auth failure, so the
 * session is kept and the caller sees the real (network/server) error.
 */
function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;
    try {
      const { data } = await bare.post<AuthResponse>('/auth/refresh', { refreshToken });
      await setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await clearTokens();
        onSessionExpired?.();
        return null;
      }
      throw error;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

api.interceptors.request.use(async (config) => {
  if (API_CONFIG.error) throw new Error(API_CONFIG.error); // never send requests from a misconfigured build
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthCall = AUTH_PATHS.some((path) => original?.url?.startsWith(path));

    if (error.response?.status !== 401 || !original || original._retried || isAuthCall) throw error;

    original._retried = true;

    // If another request already refreshed while this one was in flight, the stored token is
    // newer than the one this request was sent with: just retry with it, don't rotate again.
    const sentWith = String(original.headers.Authorization ?? '').replace('Bearer ', '');
    const current = await getAccessToken();
    // A refresh that fails for network/server reasons throws HERE, so the caller sees a
    // network error instead of a misleading 401.
    const newToken = current && current !== sentWith ? current : await refreshAccessToken();
    if (!newToken) throw error;

    original.headers.Authorization = `Bearer ${newToken}`;
    return api(original);
  },
);