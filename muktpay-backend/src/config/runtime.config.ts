export type TrustProxy = boolean | number | string;

/** "https://a.com, https://b.com" → ["https://a.com", "https://b.com"] */
export function parseCorsOrigins(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * How many reverse proxies sit in front of the API.
 *   unset / "false" → none: use the socket address (correct when the API is exposed directly)
 *   "1", "2" ...    → trust that many proxy hops (e.g. 1 = nginx / Render / Railway / an ALB)
 *   "true"          → trust everyone (clients can spoof their IP; refused in production)
 *   anything else   → passed to Express as a subnet list, e.g. "loopback, 10.0.0.0/8"
 */
export function parseTrustProxy(raw: string | undefined): TrustProxy {
  const value = (raw ?? '').trim();
  if (!value || value.toLowerCase() === 'false') return false;
  if (value.toLowerCase() === 'true') return true;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

/** 0.0.0.0 keeps the old behaviour (a phone on the same Wi-Fi can reach the API). */
export function resolveHost(raw: string | undefined): string {
  return raw?.trim() || '0.0.0.0';
}

export function resolvePort(raw: string | undefined): number {
  const value = (raw ?? '').trim();
  return value ? Number(value) : 4000;
}