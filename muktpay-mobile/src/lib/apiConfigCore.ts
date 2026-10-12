export interface ApiConfig {
  baseUrl: string;
  /** Non-null means the build is misconfigured and the app must not talk to any server. */
  error: string | null;
}

interface ResolveInputs {
  explicitUrl?: string;
  /** Your computer's LAN host as seen by the Expo dev server (development only). */
  devHost?: string;
  isDev: boolean;
}

const DEV_PORT = 4000;
const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0|\[?::1\]?)/i;

const MISSING =
  'This version of MuktPay is missing its server address (EXPO_PUBLIC_API_URL). Please install an official build or contact support.';
const NOT_HTTPS = 'The server address must start with https:// (EXPO_PUBLIC_API_URL).';
const LOCAL_HOST = "The server address can't point to localhost or a private network in a release build.";

const ok = (baseUrl: string): ApiConfig => ({ baseUrl, error: null });
const bad = (error: string): ApiConfig => ({ baseUrl: '', error });

/**
 * Development: EXPO_PUBLIC_API_URL, else your computer's LAN IP, else localhost (convenience only).
 * Production: EXPO_PUBLIC_API_URL is REQUIRED, must be https, and must not be localhost / a LAN IP.
 */
export function resolveApiConfig({ explicitUrl, devHost, isDev }: ResolveInputs): ApiConfig {
  const explicit = (explicitUrl ?? '').trim().replace(/\/+$/, '');

  if (isDev) {
    if (explicit) return ok(explicit);
    if (devHost) return ok(`http://${devHost}:${DEV_PORT}/api`);
    return ok(`http://localhost:${DEV_PORT}/api`);
  }

  if (!explicit) return bad(MISSING);
  if (!/^https:\/\//i.test(explicit)) return bad(NOT_HTTPS);

  const authority = explicit.replace(/^https:\/\//i, '').split(/[/?#]/)[0] ?? '';
  const host = (authority.split('@').pop() ?? '').replace(/:\d+$/, '');
  if (!host || PRIVATE_HOST.test(host)) return bad(LOCAL_HOST);

  return ok(explicit);
}