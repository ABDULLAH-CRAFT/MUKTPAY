import { parseUpiPayload } from './upiParser';
import { validateUpi } from './upiValidator';
import type { Result, UpiPayment } from './types';

export type { UpiPayment, UpiError, UpiErrorCode } from './types';
export { MAX_UPI_AMOUNT_PAISE } from './upiValidator';
export { buildUpiLink, checkLaunchAmount } from './upiUri';

// The launcher lives in ./upiLauncher (it imports React Native, so it is not re-exported here).

/** Scanner entry point: raw QR text → a validated payment, or a user-friendly error. */
export function readUpiPayment(raw: string): Result<UpiPayment> {
  const parsed = parseUpiPayload(raw);
  return parsed.ok ? validateUpi(parsed.value) : parsed;
}

/** A bare UPI ID ("shop@ybl") becomes a proper link; anything else passes through untouched. */
export function normalizeUpiInput(input: string): string {
  const text = input.trim();
  const isBareVpa = !text.includes(':') && !text.includes('?') && text.includes('@') && !/\s/.test(text);
  return isBareVpa ? `upi://pay?pa=${encodeURIComponent(text)}` : text;
}

/** Manual entry: accepts a bare UPI ID as well as a full link. */
export const readUpiInput = (input: string): Result<UpiPayment> => readUpiPayment(normalizeUpiInput(input));
