import { crc16ccitt } from './crc16';
import { fail, type ParsedUpi, type Result } from './types';

/**
 * BharatQR / EMV-style merchant QR: a string of TLV records (2-digit tag, 2-digit length, value)
 * ending in a CRC. Many bank-issued shop stickers use this instead of a upi:// link.
 *
 * Tags used: 52 category · 53 currency (356 = INR) · 54 amount · 59 merchant name.
 * The UPI address sits inside one of the "merchant account" templates (tags 02-51); rather than
 * trust a single fixed layout we look for a value shaped like a VPA inside those templates.
 */
const VPA = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-_]{1,64}$/;

interface Tlv {
  tag: string;
  value: string;
}

function parseTlv(input: string): Tlv[] | null {
  const records: Tlv[] = [];
  let i = 0;
  while (i < input.length) {
    const tag = input.slice(i, i + 2);
    const lengthText = input.slice(i + 2, i + 4);
    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lengthText)) return null;
    const length = Number(lengthText);
    const value = input.slice(i + 4, i + 4 + length);
    if (value.length !== length) return null;
    records.push({ tag, value });
    i += 4 + length;
  }
  return records;
}

export const looksLikeBharatQr = (raw: string) => raw.startsWith('000201') && raw.length > 20;

function findVpa(templateValue: string): string | null {
  // Look inside the template first. Checking the whole value first would wrongly accept
  // "0010A0000005240108shop@ybl" (two records glued together) as one giant VPA.
  const nested = parseTlv(templateValue);
  const inner = nested?.find((record) => VPA.test(record.value))?.value;
  if (inner) return inner;
  return VPA.test(templateValue) ? templateValue : null;
}

export function parseBharatQr(raw: string): Result<ParsedUpi> {
  const corrupt = () => fail('BHARATQR_CORRUPT', 'This QR code looks damaged. Try scanning it again.');

  // The last 8 chars are "6304" + CRC over everything before the CRC value.
  if (raw.slice(-8, -4) !== '6304') return corrupt();
  const expected = crc16ccitt(raw.slice(0, -4)).toString(16).toUpperCase().padStart(4, '0');
  if (expected !== raw.slice(-4).toUpperCase()) return corrupt();

  const records = parseTlv(raw);
  if (!records) return corrupt();

  const top = new Map(records.map((r) => [r.tag, r.value]));
  if (top.get('00') !== '01') return corrupt();

  let vpa: string | null = null;
  for (const record of records) {
    const tag = Number(record.tag);
    if (tag >= 2 && tag <= 51) {
      vpa = findVpa(record.value);
      if (vpa) break;
    }
  }
  if (!vpa) {
    return fail(
      'BHARATQR_NO_UPI',
      'This is a card / BharatQR code without a UPI ID. MuktPay needs a UPI QR code.',
    );
  }

  const params: Record<string, string> = { pa: vpa };
  const name = top.get('59');
  const amount = top.get('54');
  const currency = top.get('53');
  const category = top.get('52');
  if (name) params.pn = name;
  if (amount) params.am = amount;
  if (currency) params.cu = currency === '356' ? 'INR' : currency;
  if (category) params.mc = category;

  return { ok: true, value: { source: 'bharat-qr', params, rawQuery: null } };
}
