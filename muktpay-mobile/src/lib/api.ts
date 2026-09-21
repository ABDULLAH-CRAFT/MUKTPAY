import axios, { type InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './tokenStorage';
import type { AuthResponse } from '@/types/auth';

const BACKEND_PORT = 4000;

/**
 * A phone can't reach "localhost" on your computer. In development Expo Go already knows
 * your computer's LAN address (it's how the JS bundle loaded), so we reuse that host.
 */
function resolveBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit;

  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:${BACKEND_PORT}/api`;

  return `http://localhost:${BACKEND_PORT}/api`; // iOS simulator / web fallback
}

export const API_BASE_URL = resolveBaseUrl();

export const api = axios.create({ baseURL: API_BASE_URL, timeout: 10_000 });
// Interceptor-free client, used only to call /auth/refresh (avoids refresh loops).
const bare = axios.create({ baseURL: API_BASE_URL, timeout: 10_000 });

// Called when the server definitively rejects our refresh token → AuthProvider shows login.
let onSessionExpired: (() => void) | null = null;
export const setSessionExpiredHandler = (handler: (() => void) | null) => {
  onSessionExpired = handler;
};

// Only ONE refresh runs at a time. Several requests failing with 401 together all wait on
// the same promise, because refresh tokens are single-use (a second call would look like theft).
let refreshInFlight: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;
    try {
      const { data } = await bare.post<AuthResponse>('/auth/refresh', { refreshToken });
      await setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch (error) {
      // Only a definitive "no" ends the session. A network error must not log people out.
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await clearTokens();
        onSessionExpired?.();
      }
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

api.interceptors.request.use(async (config) => {
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
    const newToken = current && current !== sentWith ? current : await refreshAccessToken();
    if (!newToken) throw error;

    original.headers.Authorization = `Bearer ${newToken}`;
    return api(original);
  },
);
