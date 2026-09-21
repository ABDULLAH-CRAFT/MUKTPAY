import { paiseToUpiAmount } from '@/utils/money';
import type { UpiPayment } from './types';
import { MAX_UPI_AMOUNT_PAISE, sanitizeText } from './upiValidator';

/**
 * Which app's link format to produce. Android understands the generic `upi://pay` and shows the
 * system app chooser. iOS has no such chooser: each app registers its own scheme.
 * (iOS schemes are the widely used ones; verify on a real device before relying on them.)
 */
export type UpiScheme = 'upi' | 'phonepe' | 'gpay' | 'paytm';

const BASE: Record<UpiScheme, string> = {
  upi: 'upi://pay',
  phonepe: 'phonepe://pay',
  gpay: 'gpay://upi/pay',
  paytm: 'paytmmp://pay',
};

export interface BuildOptions {
  /** Integer paise to request. */
  amountPaise: number;
  /** Optional transaction note (max 80 chars). Overrides the QR's own note. */
  note?: string;
  scheme?: UpiScheme;
}

export interface BuiltUpiLink {
  url: string;
  /** true → the merchant's original query was passed through untouched (signature intact). */
  preservedOriginal: boolean;
}

export class InvalidPaymentError extends Error {}

const enc = encodeURIComponent;
/** `@` is legal and conventional in a VPA; some apps handle a literal @ better than %40. */
const encVpa = (vpa: string) => enc(vpa).replace(/%40/g, '@');

/** Returns a problem description, or null when the amount can safely be requested. */
export function checkLaunchAmount(amountPaise: number): string | null {
  if (!Number.isInteger(amountPaise)) return 'The amount must be a whole number of paise.';
  if (amountPaise <= 0) return 'The amount must be greater than zero.';
  if (amountPaise > MAX_UPI_AMOUNT_PAISE) return 'The amount is above the UPI limit.';
  return null;
}

/**
 * Builds the link that opens a UPI app with the payment pre-filled.
 *
 * Two modes, chosen automatically:
 *  1. PASS-THROUGH: the QR came from a upi:// link and we are paying exactly what it says.
 *     We forward the original query string byte-for-byte. Anything the merchant put in it
 *     (a digital `sign`, order reference `tr`, `mode`, `orgid`...) stays valid.
 *  2. REBUILD: the amount is different (typed by the user, or one tranche of a split) or the QR
 *     was BharatQR. A changed amount would invalidate `sign` and reuse a single-order `tr`, so we
 *     rebuild from a short allow-list: pa, pn, mc, am, cu, tn. Everything else is dropped.
 */
export function buildUpiLink(payment: UpiPayment, options: BuildOptions): BuiltUpiLink {
  const problem = checkLaunchAmount(options.amountPaise);
  if (problem) throw new InvalidPaymentError(problem);

  const base = BASE[options.scheme ?? 'upi'];

  const unchanged =
    payment.source === 'upi-uri' &&
    payment.rawQuery &&
    payment.amountPaise === options.amountPaise &&
    options.note === undefined;
  if (unchanged) return { url: `${base}?${payment.rawQuery}`, preservedOriginal: true };

  const parts = [`pa=${encVpa(payment.payeeVpa)}`];
  if (payment.nameFromQr) parts.push(`pn=${enc(payment.payeeName)}`);
  if (payment.merchantCode) parts.push(`mc=${enc(payment.merchantCode)}`);
  parts.push(`am=${paiseToUpiAmount(options.amountPaise)}`);
  parts.push('cu=INR');
  const note = sanitizeText(options.note ?? payment.note ?? '', 80);
  if (note) parts.push(`tn=${enc(note)}`);

  return { url: `${base}?${parts.join('&')}`, preservedOriginal: false };
}
