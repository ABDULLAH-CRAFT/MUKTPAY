/**
 * Everything the app needs to raise a payment request in this merchant's name.
 *
 * `vpa` and `shopName` become the `pa` and `pn` fields of every QR code we generate,
 * so both are stored already sanitised and ready to put in a URL.
 */
export interface MerchantProfile {
  /** Shown to the customer inside their UPI app. Sanitised, 2–50 chars. */
  shopName: string;
  /** Lowercase UPI ID, e.g. "guptakirana@okhdfcbank". */
  vpa: string;
  /**
   * How far we actually checked the UPI ID.
   *  - 'format'  : the string is shaped like a VPA and the handle is one we recognise (or not).
   *                This is ALL we can do without a payment aggregator. It does NOT prove the
   *                account exists, belongs to this person, or can receive money.
   *  - 'penny'   : reserved — a ₹1 test transfer the merchant confirms they received.
   *  - 'provider': reserved — verified through an aggregator's validate-VPA API.
   */
  verification: 'format' | 'penny' | 'provider';
  /** Informational label from the handle, e.g. "Google Pay · HDFC Bank". Null when unrecognised. */
  issuerLabel: string | null;
  /** ISO timestamp of the last save. */
  savedAt: string;
}

/** The current schema version, so a future change can migrate instead of silently misreading. */
export const MERCHANT_PROFILE_VERSION = 1;

export interface StoredMerchantProfile {
  version: number;
  profile: MerchantProfile;
}
