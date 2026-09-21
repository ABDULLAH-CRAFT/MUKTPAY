/**
 * All money in MuktPay is an INTEGER NUMBER OF PAISE (₹1 = 100 paise).
 * Floating point can't represent 0.1 exactly, so splitting ₹6,800 with floats can lose
 * or invent a paisa. Integers can't. Convert only at the edges (user input, UPI link).
 */

/** 1234567 → "12,34,567" (Indian digit grouping). */
export function formatIndianInteger(value: number): string {
  const digits = Math.trunc(Math.abs(value)).toString();
  if (digits.length <= 3) return digits;
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${lastThree}`;
}

export interface PaiseParts {
  negative: boolean;
  whole: string; // "1,999"
  fraction: string | null; // "50", or null when the amount is a whole number of rupees
}

export function splitPaise(paise: number): PaiseParts {
  const abs = Math.abs(Math.round(paise));
  const fraction = abs % 100;
  return {
    negative: paise < 0,
    whole: formatIndianInteger(Math.floor(abs / 100)),
    fraction: fraction === 0 ? null : String(fraction).padStart(2, '0'),
  };
}

/** 199900 → "₹1,999", 199950 → "₹1,999.50" */
export function formatPaise(paise: number, opts: { alwaysShowDecimals?: boolean } = {}): string {
  const { negative, whole, fraction } = splitPaise(paise);
  const decimals = fraction ?? (opts.alwaysShowDecimals ? '00' : null);
  return `${negative ? '-' : ''}₹${whole}${decimals ? `.${decimals}` : ''}`;
}

/**
 * Parses what a person types ("₹1,999", "1999.5") into paise. Returns null if invalid.
 * Works on the string so no floating point is ever involved.
 */
export function parseRupeesToPaise(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]/g, '');
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  const rupees = Number(match[1]);
  const paise = match[2] ? Number(match[2].padEnd(2, '0')) : 0;
  return rupees * 100 + paise;
}

/** 199900 → "1999.00": the format UPI's `am` field expects (always two decimals, no symbol). */
export function paiseToUpiAmount(paise: number): string {
  const abs = Math.abs(Math.round(paise));
  return `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}
