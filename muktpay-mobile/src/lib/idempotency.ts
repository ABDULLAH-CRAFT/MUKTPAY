/**
 * A unique key for one attempt at creating something, sent as the `Idempotency-Key` header so the
 * server can recognise a retry. It only needs to be unique per merchant, not secret, and the
 * project has no UUID library, so this uses the platform's UUID generator when there is one and a
 * timestamp + random fallback when there isn't. Both fit the server's 8-64 character rule.
 */
export function newIdempotencyKey(): string {
  const webCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (webCrypto?.randomUUID) return webCrypto.randomUUID();

  const random = () => Math.random().toString(36).slice(2, 10);
  return `k-${Date.now().toString(36)}-${random()}${random()}`;
}