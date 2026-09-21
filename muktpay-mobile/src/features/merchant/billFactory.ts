import { sanitizeText } from '@/services/upi/upiValidator';
import type { Bill, BillChunk } from '@/types/bill';
import { paiseToUpiAmount } from '@/utils/money';
import type { SplitPlan } from './splitEngine';

/**
 * Turns a split plan into a bill: one UPI deep link, and therefore one QR code, per chunk.
 */

const enc = encodeURIComponent;
/** `@` is legal and conventional in a VPA; some apps handle a literal @ better than %40. */
const encVpa = (vpa: string) => enc(vpa).replace(/%40/g, '@');

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 — these get misread aloud

/**
 * A short, uppercase, alphanumeric reference for the whole bill.
 * Time-ordered prefix so two bills made seconds apart can't collide, plus random suffix.
 */
export function makeBillRef(now: Date = new Date(), random: () => number = Math.random): string {
  const stamp = now.getTime().toString(36).toUpperCase().slice(-6);
  let suffix = '';
  for (let i = 0; i < 2; i++) suffix += REF_ALPHABET[Math.floor(random() * REF_ALPHABET.length)];
  return `MP${stamp}${suffix}`;
}

export interface MerchantUpiParams {
  vpa: string;
  shopName: string;
  amountPaise: number;
  /** Goes in `tn`. Keep it short — several apps truncate hard. */
  note: string;
}

/**
 * Builds the `upi://pay?…` string for one chunk.
 *
 * Deliberately NOT setting `tr` (transaction reference). `tr` is meant to be unique per
 * transaction, and several PSPs deduplicate on it: giving every chunk of a bill the same `tr`
 * is a reliable way to have the second payment silently rejected as a duplicate. The shared
 * reference goes in `tn` instead, where it's visible to the customer and safe to repeat.
 *
 * Also no `sign` and no `mc`: those belong to aggregator-issued merchant QRs. This is a plain
 * P2P collect link, which is exactly why Phase 6 can't confirm payment without an aggregator.
 */
export function buildMerchantUpiUrl({ vpa, shopName, amountPaise, note }: MerchantUpiParams): string {
  const parts = [`pa=${encVpa(vpa)}`, `pn=${enc(sanitizeText(shopName, 50))}`, `am=${paiseToUpiAmount(amountPaise)}`, 'cu=INR'];
  const cleanNote = sanitizeText(note, 40);
  if (cleanNote) parts.push(`tn=${enc(cleanNote)}`);
  return `upi://pay?${parts.join('&')}`;
}

/**
 * The note each chunk carries: "MP7X2K9A 2/3".
 * Same reference on every chunk (so they group), different position (so no app treats two
 * chunks as a repeat of the same request).
 */
export const chunkNote = (ref: string, index: number, count: number): string => `${ref} ${index}/${count}`;

export interface CreateBillInput {
  shopName: string;
  vpa: string;
  plan: SplitPlan;
  capPaise: number;
}

export function createBill(
  { shopName, vpa, plan, capPaise }: CreateBillInput,
  now: Date = new Date(),
  ref: string = makeBillRef(now),
): Bill {
  const chunks: BillChunk[] = plan.chunks.map((chunk) => ({
    index: chunk.index,
    amountPaise: chunk.amountPaise,
    status: 'pending',
    paidAt: null,
    upiUrl: buildMerchantUpiUrl({
      vpa,
      shopName,
      amountPaise: chunk.amountPaise,
      note: chunkNote(ref, chunk.index, plan.chunkCount),
    }),
  }));

  return {
    ref,
    createdAt: now.toISOString(),
    shopName,
    vpa,
    totalPaise: plan.totalPaise,
    capPaise,
    strategy: plan.strategy,
    chunks,
  };
}

/** Returns a new bill with one chunk's status flipped. Bills are treated as immutable. */
export function setChunkStatus(bill: Bill, index: number, status: BillChunk['status'], now: Date = new Date()): Bill {
  return {
    ...bill,
    chunks: bill.chunks.map((chunk) =>
      chunk.index === index
        ? { ...chunk, status, paidAt: status === 'paid' ? now.toISOString() : null }
        : chunk,
    ),
  };
}
