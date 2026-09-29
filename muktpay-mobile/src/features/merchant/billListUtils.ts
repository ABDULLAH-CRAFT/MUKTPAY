import type { Bill } from '@/types/bill';

/**
 * Pure helpers around a merchant's saved bill list — capping, sorting, and the JSON envelope.
 * Deliberately has NO import of AsyncStorage or anything from react-native: billStorage.ts does
 * the actual I/O and calls into this file, which keeps this logic runnable and testable under
 * plain Node (vitest), the same way merchantStorage.ts's shape checks would be if split out.
 */

export const BILL_LIST_VERSION = 1;

/** Keep the most recent bills only. History is a convenience, not a ledger — cap it generously
 *  but don't let one very active shop grow the blob without bound. */
export const MAX_STORED_BILLS = 200;

export interface StoredBillList {
  version: number;
  bills: Bill[];
}

const isBill = (value: unknown): value is Bill => {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Partial<Bill>;
  return (
    typeof b.ref === 'string' &&
    b.ref.length > 0 &&
    typeof b.totalPaise === 'number' &&
    Array.isArray(b.chunks) &&
    (b.state === 'open' || b.state === 'closed' || b.state === 'cancelled')
  );
};

/** Newest first, capped at MAX_STORED_BILLS. Called every time the list is written. */
export function capBillList(bills: Bill[], max: number = MAX_STORED_BILLS): Bill[] {
  return [...bills].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, max);
}

export function serializeBillList(bills: Bill[]): string {
  const payload: StoredBillList = { version: BILL_LIST_VERSION, bills };
  return JSON.stringify(payload);
}

/**
 * Parses what was read from storage. Anything unexpected — corrupt JSON, a schema from a future
 * version, an entry that doesn't look like a Bill — comes back as an empty list rather than a
 * half-trusted one. Losing bill history is a rare inconvenience; a wrongly-parsed bill amount is not.
 */
export function parseBillList(raw: string | null): Bill[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<StoredBillList>;
    if (parsed.version !== BILL_LIST_VERSION || !Array.isArray(parsed.bills)) return [];
    return parsed.bills.filter(isBill);
  } catch {
    return [];
  }
}
