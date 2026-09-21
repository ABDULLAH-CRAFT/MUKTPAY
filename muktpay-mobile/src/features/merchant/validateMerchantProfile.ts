import { readUpiInput } from '@/services/upi';
import { sanitizeText } from '@/services/upi/upiValidator';

/**
 * Merchant-side checks. Deliberately reuses the SAME parser the scanner uses, so a UPI ID a
 * merchant saves is one the app would also accept from a QR code — one definition of "valid",
 * not two that drift apart.
 *
 * IMPORTANT: this is format validation only. Nothing here proves the account exists or belongs
 * to the person typing it. Real verification needs NPCI (via a payment aggregator) or a penny
 * transfer the merchant confirms. Never present this as "verified" in the UI.
 */

export const SHOP_NAME_MIN = 2;
export const SHOP_NAME_MAX = 50;

export function validateShopName(raw: string): string | undefined {
  const name = sanitizeText(raw, SHOP_NAME_MAX + 1);
  if (name.length === 0) return 'Enter the name customers should see';
  if (name.length < SHOP_NAME_MIN) return `Use at least ${SHOP_NAME_MIN} characters`;
  if (name.length > SHOP_NAME_MAX) return `Use at most ${SHOP_NAME_MAX} characters`;
  return undefined;
}

/** The sanitised form of what the merchant typed — this is what gets stored and put in `pn`. */
export const normalizeShopName = (raw: string): string => sanitizeText(raw, SHOP_NAME_MAX);

export interface VpaCheck {
  ok: boolean;
  /** Lowercase, trimmed VPA. Only meaningful when ok. */
  vpa: string;
  /** "Google Pay · HDFC Bank", or null when the handle isn't in our table (not an error). */
  issuerLabel: string | null;
  /** Safe to show the user. Only set when !ok. */
  message?: string;
}

export function checkVpa(raw: string): VpaCheck {
  const input = raw.trim();
  const empty: VpaCheck = { ok: false, vpa: '', issuerLabel: null };

  if (!input) return { ...empty, message: 'Enter your UPI ID' };

  // A merchant types an ID, not a link. Rejecting links early gives a clearer message than
  // letting the parser complain about a malformed URI, and stops someone pasting a QR payload
  // (with someone else's amount and order ref baked in) as their "UPI ID".
  if (/[:?/]/.test(input)) {
    return { ...empty, message: 'Enter just the UPI ID, like shop@ybl — not a full link' };
  }
  if (/\s/.test(input)) {
    return { ...empty, message: 'A UPI ID has no spaces' };
  }
  if (!input.includes('@')) {
    return { ...empty, message: 'A UPI ID looks like shop@ybl' };
  }

  const result = readUpiInput(input);
  if (!result.ok) return { ...empty, message: result.error.message };

  const { payeeVpa, issuer } = result.value;
  return {
    ok: true,
    vpa: payeeVpa,
    issuerLabel: issuer ? `${issuer.app} · ${issuer.bank}` : null,
  };
}
