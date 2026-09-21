import { lookupIssuer } from './pspRegistry';
import { fail, type ParsedUpi, type Result, type UpiPayment } from './types';
import { parseRupeesToPaise } from '@/utils/money';

// UPI VPA: 2–256 chars before "@", a handle starting with a letter after it.
const VPA = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-_]{1,64}$/;

/** NPCI's highest per-transaction limit (₹5 lakh, special categories). Phase 5 refines this. */
export const MAX_UPI_AMOUNT_PAISE = 500_000 * 100;

// Control chars, bidi overrides (can make "moc.evil" display as "live.com") and zero-width chars.
const INVISIBLE = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

/** QR text is attacker-controlled: strip invisible/spoofing characters, collapse spaces, cap length. */
export function sanitizeText(value: string, maxLength: number): string {
  return value.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function validateUpi(parsed: ParsedUpi): Result<UpiPayment> {
  const { params } = parsed;

  // 1. Payee address
  const pa = params.pa?.trim();
  if (!pa) return fail('MISSING_PAYEE', 'No UPI ID found in this QR code.');
  const payeeVpa = pa.toLowerCase();
  if (!VPA.test(payeeVpa)) {
    return fail('INVALID_VPA', `"${sanitizeText(pa, 60)}" is not a valid UPI ID.`);
  }

  // 2. Currency: UPI is INR only
  const currency = params.cu?.trim().toUpperCase();
  if (currency && currency !== 'INR') {
    return fail('UNSUPPORTED_CURRENCY', `Unsupported currency (${sanitizeText(currency, 10)}). Only INR is supported.`);
  }

  // 3. Amount (optional). If present it must be right: we never silently ignore a bad amount.
  let amountPaise: number | null = null;
  const am = params.am?.trim();
  if (am) {
    const paise = parseRupeesToPaise(am);
    if (paise === null || paise <= 0) {
      return fail('INVALID_AMOUNT', 'The amount in this QR code is not valid.');
    }
    if (paise > MAX_UPI_AMOUNT_PAISE) {
      return fail('AMOUNT_TOO_HIGH', 'The amount in this QR code is above the UPI limit.');
    }
    amountPaise = paise;
  }

  // 4. Display fields
  const [username, handle] = payeeVpa.split('@');
  const qrName = params.pn ? sanitizeText(params.pn, 100) : '';

  return {
    ok: true,
    value: {
      source: parsed.source,
      payeeVpa,
      payeeName: qrName || titleCase(username),
      nameFromQr: qrName.length > 0,
      amountPaise,
      currency: 'INR',
      note: params.tn ? sanitizeText(params.tn, 200) || null : null,
      merchantCode: params.mc ? sanitizeText(params.mc, 10) || null : null,
      transactionRef: params.tr ? sanitizeText(params.tr, 50) || null : null,
      issuer: lookupIssuer(handle),
      params,
      rawQuery: parsed.rawQuery,
    },
  };
}
