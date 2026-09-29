/**
 * Everything the app needs to raise a payment request in this merchant's name.
 *
 * This is now the server's record (GET/PUT/DELETE /merchant/profile) — one row per merchant
 * account, not a per-device SecureStore cache — so the shop follows the merchant to any device
 * they log into, and every bill built from it traces back to an account.
 */
export interface MerchantProfile {
  id: string;
  /** Shown to the customer inside their UPI app when they scan. */
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
  createdAt: string;
  updatedAt: string;
}

/** What the form sends to PUT /merchant/profile. */
export interface UpsertMerchantProfileInput {
  shopName: string;
  vpa: string;
  issuerLabel: string | null;
}
