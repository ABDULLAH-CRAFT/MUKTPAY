import { looksLikeBharatQr, parseBharatQr } from './bharatQr';
import { fail, type ParsedUpi, type Result } from './types';

const MAX_LENGTH = 2048;

function decode(value: string): string | null {
  try {
    // '+' means space in form-style encoding, which some QR generators use for names.
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return null;
  }
}

/**
 * Turns whatever the camera read into UPI fields. Extraction only: it says WHAT the QR
 * contains, and upiValidator.ts decides whether that is acceptable.
 *
 * Accepts: upi://pay?...  (and upi:pay?...)  ·  BharatQR (EMV) codes.
 * Rejects: web links, other UPI actions (mandates...), and QR codes with repeated fields.
 */
export function parseUpiPayload(rawInput: string): Result<ParsedUpi> {
  let raw = rawInput.trim();
  if (!raw) return fail('EMPTY', 'The QR code is empty.');
  if (raw.length > MAX_LENGTH) return fail('NOT_UPI', "This doesn't look like a UPI payment QR code.");

  if (looksLikeBharatQr(raw)) return parseBharatQr(raw);

  // Some generators wrap the value in quotes.
  if (/^(["']).*\1$/.test(raw)) raw = raw.slice(1, -1).trim();

  const match = /^upi:(?:\/\/)?([a-z]+)\??/i.exec(raw);
  if (!match) return fail('NOT_UPI', "This isn't a UPI payment QR code.");

  const action = match[1].toLowerCase();
  if (action !== 'pay') {
    return fail('UNSUPPORTED_ACTION', `This UPI code is for "${action}", not a payment.`);
  }

  const queryStart = raw.indexOf('?');
  const query = queryStart === -1 ? '' : raw.slice(queryStart + 1).split('#')[0];

  const params: Record<string, string> = {};
  for (const pair of query.split('&')) {
    const eq = pair.indexOf('=');
    if (eq <= 0) continue;

    const key = decode(pair.slice(0, eq))?.trim().toLowerCase();
    const value = decode(pair.slice(eq + 1));
    if (key === undefined || value === null) {
      return fail('BAD_ENCODING', 'This QR code is malformed.');
    }
    // `pa=good@ybl&pa=evil@ybl` is a spoofing trick: different apps pick different copies.
    if (key in params) {
      return fail('DUPLICATE_FIELD', 'This QR code repeats a field and cannot be trusted.');
    }
    params[key] = value;
  }

  return { ok: true, value: { source: 'upi-uri', params, rawQuery: query } };
}
