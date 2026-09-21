import type { SplitStrategy } from './split';

/**
 * A bill is ONE amount the customer owes, collected as SEVERAL UPI payments because their app
 * or bank caps a single transaction. Every chunk carries the same `ref`, which is what ties the
 * payments back together — in the app, and in the narration on both parties' statements.
 *
 * That shared reference is the whole compliance story. Splitting a payment to stay under a
 * REPORTING threshold is structuring; splitting it to fit under a per-transaction CAP, with every
 * part openly labelled as part N of M of one order, is not. The `ref` is what makes the second
 * thing legible as the second thing, so it is never optional and never per-chunk.
 */

export type ChunkStatus = 'pending' | 'paid';

export interface BillChunk {
  /** 1-based position: the order the customer pays them in. */
  index: number;
  amountPaise: number;
  status: ChunkStatus;
  /** ISO timestamp the merchant marked it paid, or null. */
  paidAt: string | null;
  /** The exact `upi://pay?…` string encoded into this chunk's QR code. */
  upiUrl: string;
}

export interface Bill {
  /**
   * Shared reference for the whole bill, e.g. "MP7X2K9A". Short, uppercase alphanumeric so it
   * survives every UPI app's handling of the note field and is readable back over a counter.
   */
  ref: string;
  createdAt: string;
  /** Snapshot of the merchant profile at creation time — editing the profile later must not
   *  silently rewrite the amounts and payee of a bill already shown to a customer. */
  shopName: string;
  vpa: string;
  totalPaise: number;
  /** The per-transaction cap this bill was split under. */
  capPaise: number;
  strategy: SplitStrategy;
  chunks: BillChunk[];
}

export const BILL_VERSION = 1;

export interface StoredBill {
  version: number;
  bill: Bill;
}

/** Paise the merchant has marked as received. */
export const paidPaise = (bill: Bill): number =>
  bill.chunks.reduce((sum, c) => (c.status === 'paid' ? sum + c.amountPaise : sum), 0);

/** The chunk the customer should scan next, or null when the bill is settled. */
export const nextPendingChunk = (bill: Bill): BillChunk | null =>
  bill.chunks.find((c) => c.status === 'pending') ?? null;

export const isSettled = (bill: Bill): boolean => bill.chunks.every((c) => c.status === 'paid');
