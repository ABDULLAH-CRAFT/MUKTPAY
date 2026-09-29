/**
 * Turns a bill chunk into the `upi://pay?…` string encoded into its QR code.
 *
 * This is the server-side port of muktpay-mobile/src/features/merchant/billFactory.ts, now
 * authoritative: the server creates the bill and its QR contents, the mobile copy is no longer
 * used for that. The two must keep producing byte-identical output for the same input — if one
 * changes, change the other and its tests too.
 */

const enc = encodeURIComponent;
/** `@` is legal and conventional in a VPA; some apps handle a literal @ better than %40. */
const encVpa = (vpa: string) => enc(vpa).replace(/%40/g, '@');

// Control chars, bidi overrides (can make "moc.evil" display as "live.com") and zero-width chars.
const INVISIBLE = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

const sanitize = (value: string, maxLength: number): string =>
  value.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim().slice(0, maxLength);

/** 199900 → "1999.00": the format UPI's `am` field expects (always two decimals, no symbol). */
function paiseToUpiAmount(paise: number): string {
  const abs = Math.abs(Math.round(paise));
  return `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 — these get misread aloud

/**
 * A short, uppercase, alphanumeric reference for the whole bill.
 * Time-ordered prefix so two bills made seconds apart can't collide, plus a random suffix.
 */
export function makeBillRef(now: Date = new Date(), random: () => number = Math.random): string {
  const stamp = now.getTime().toString(36).toUpperCase().slice(-6);
  let suffix = '';
  for (let i = 0; i < 2; i++) suffix += REF_ALPHABET[Math.floor(random() * REF_ALPHABET.length)];
  return `MP${stamp}${suffix}`;
}

export interface MerchantUpiParams {
  vpa: string;
  shopName: string;
  amountPaise: number;
  /** Goes in `tn`. Keep it short — several apps truncate hard. */
  note: string;
}

/**
 * Deliberately NOT setting `tr` (transaction reference). `tr` is meant to be unique per
 * transaction, and several PSPs deduplicate on it: giving every chunk of a bill the same `tr`
 * is a reliable way to have the second payment silently rejected as a duplicate. The shared
 * reference goes in `tn` instead, where it's visible to the customer and safe to repeat.
 *
 * Also no `sign` and no `mc`: those belong to aggregator-issued merchant QRs. This is a plain
 * P2P collect link, which is exactly why real payment confirmation still needs an aggregator.
 */
export function buildMerchantUpiUrl({ vpa, shopName, amountPaise, note }: MerchantUpiParams): string {
  const parts = [`pa=${encVpa(vpa)}`, `pn=${enc(sanitize(shopName, 50))}`, `am=${paiseToUpiAmount(amountPaise)}`, 'cu=INR'];
  const cleanNote = sanitize(note, 40);
  if (cleanNote) parts.push(`tn=${enc(cleanNote)}`);
  return `upi://pay?${parts.join('&')}`;
}

/** The note each chunk carries: "MP7X2K9A 2/3". Same ref on every chunk, different position. */
export const chunkNote = (ref: string, index: number, count: number): string => `${ref} ${index}/${count}`;
