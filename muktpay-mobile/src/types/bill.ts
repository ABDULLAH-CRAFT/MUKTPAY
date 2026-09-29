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
 *
 * Bills live on the server (POST/GET /bills, PATCH /bills/:ref/chunks/:index, POST /bills/:ref/cancel).
 */

export type ChunkStatus = 'pending' | 'paid';

/**
 * open      : being collected.
 * settled   : every chunk marked paid.
 * cancelled : called off by the merchant. Read-only.
 * expired   : sat open with nothing paid. Recording a late payment reopens it.
 */
export type BillStatus = 'open' | 'settled' | 'cancelled' | 'expired';

export interface BillChunk {
  id: string;
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
  id: string;
  /**
   * Shared reference for the whole bill, e.g. "MP7X2K9A". Short, uppercase alphanumeric so it
   * survives every UPI app's handling of the note field and is readable back over a counter.
   */
  ref: string;
  createdAt: string;
  /** After this, an open bill with nothing paid is shown as expired. */
  expiresAt: string;
  cancelledAt: string | null;
    /** Optional free-text label, e.g. "Ramesh, order 12". */
  note: string | null;
  /** Snapshot of the merchant profile at creation time — editing the profile later must not
   *  silently rewrite the amounts and payee of a bill already shown to a customer. */
  shopName: string;
  vpa: string;
  totalPaise: number;
  /** The per-transaction cap this bill was split under. */
  capPaise: number;
  strategy: SplitStrategy;
  status: BillStatus;
  chunks: BillChunk[];
}

/** One page of GET /bills. `nextCursor` is null on the last page. */
export interface BillsPage {
  items: Bill[];
  nextCursor: string | null;
}

/** What POST /bills accepts. */
export interface CreateBillInput {
  totalPaise: number;
  capPaise?: number;
  strategy?: SplitStrategy;
  note?: string;
}

/** Paise the merchant has marked as received. */
export const paidPaise = (bill: Bill): number =>
  bill.chunks.reduce((sum, c) => (c.status === 'paid' ? sum + c.amountPaise : sum), 0);

/** The chunk the customer should scan next, or null when there's nothing left to collect. */
export const nextPendingChunk = (bill: Bill): BillChunk | null =>
  bill.chunks.find((c) => c.status === 'pending') ?? null;

export const isSettled = (bill: Bill): boolean => bill.status === 'settled';
export const isCancelled = (bill: Bill): boolean => bill.status === 'cancelled';

/** Mirrors the server rule: only a bill with nothing marked paid can be called off. */
export const canCancelBill = (bill: Bill): boolean =>
  (bill.status === 'open' || bill.status === 'expired') && bill.chunks.every((c) => c.status === 'pending');