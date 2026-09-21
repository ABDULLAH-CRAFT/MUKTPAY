export type QrSource = 'upi-uri' | 'bharat-qr';

/**
 * What the parser produces: the QR's fields as plain strings, no judgement yet.
 * Both QR formats are normalised into the same UPI parameter names:
 *   pa payee address (VPA) · pn payee name · am amount (rupees) · cu currency
 *   tn note · mc merchant category code · tr transaction reference
 */
export interface ParsedUpi {
  source: QrSource;
  params: Record<string, string>;
  /**
   * The query string exactly as scanned (still percent-encoded), for `upi://` links only.
   * Signed merchant QRs carry a `sign` value that must be passed on byte-for-byte, and our decoded
   * `params` can't guarantee that (e.g. a literal "+" in base64 would have become a space).
   */
  rawQuery: string | null;
}

/** What the validator produces: checked, typed and safe to display. */
export interface UpiPayment {
  source: QrSource;
  payeeVpa: string; // lowercase
  payeeName: string; // sanitised. Falls back to the VPA username when the QR has no name.
  /** false when the QR carried no name, so `payeeName` was derived from the VPA. */
  nameFromQr: boolean;
  /** Integer paise, or null when the QR leaves the amount for the payer to enter. */
  amountPaise: number | null;
  currency: 'INR';
  note: string | null;
  merchantCode: string | null;
  transactionRef: string | null;
  /** e.g. { app: 'PhonePe', bank: 'Yes Bank' } from the VPA handle, when recognised. */
  issuer: { app: string; bank: string } | null;
  /** Decoded QR fields. */
  params: Record<string, string>;
  /** See ParsedUpi.rawQuery. Null for BharatQR. */
  rawQuery: string | null;
}

export type UpiErrorCode =
  | 'EMPTY'
  | 'NOT_UPI'
  | 'UNSUPPORTED_ACTION'
  | 'DUPLICATE_FIELD'
  | 'BAD_ENCODING'
  | 'BHARATQR_CORRUPT'
  | 'BHARATQR_NO_UPI'
  | 'MISSING_PAYEE'
  | 'INVALID_VPA'
  | 'INVALID_AMOUNT'
  | 'AMOUNT_TOO_HIGH'
  | 'UNSUPPORTED_CURRENCY';

export interface UpiError {
  code: UpiErrorCode;
  /** Safe to show to the user. */
  message: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: UpiError };

export const fail = (code: UpiErrorCode, message: string): { ok: false; error: UpiError } => ({
  ok: false,
  error: { code, message },
});
