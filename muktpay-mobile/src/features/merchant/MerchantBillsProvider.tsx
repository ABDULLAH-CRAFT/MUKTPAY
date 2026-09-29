import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import type { Bill, ChunkStatus } from '@/types/bill';
import { cancelBill, closeBill, setChunkStatus } from './billFactory';
import { readBills, writeBills } from './billStorage';

interface MerchantBillsContextValue {
  status: 'loading' | 'ready';
  /** Every bill ever created on this device for this account, newest first. */
  bills: Bill[];
  /** The one bill currently being worked, whether mid-collection or fully paid and awaiting
   *  "Done". Null when nothing is open. There is only ever one at a time. */
  activeBill: Bill | null;
  /** No-ops (and leaves the list unchanged) if a bill is already open — finish or cancel it first. */
  startBill: (bill: Bill) => void;
  markChunk: (index: number, status: ChunkStatus) => void;
  /** Merchant tapped "Done" after every chunk was paid. */
  closeActiveBill: () => void;
  /** Merchant abandoned the bill before it was fully paid. */
  cancelActiveBill: () => void;
}

const MerchantBillsContext = createContext<MerchantBillsContextValue | null>(null);

/**
 * Bill history, persisted per account so a force-quit mid-collection no longer loses the bill.
 *
 * Every mutation follows the same shape: compute the next array inside the `setBills` updater,
 * fire the storage write from there too, and return the new array. Doing the write inside the
 * updater (rather than after, from the outer closure) means it always sees the latest state even
 * if two calls land in the same tick — there's no stale `bills` variable to accidentally persist.
 */
export function MerchantBillsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const [bills, setBills] = useState<Bill[]>([]);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setBills([]);

    if (!userId) {
      setStatus('ready');
      return;
    }

    (async () => {
      const stored = await readBills(userId);
      if (cancelled) return;
      setBills(stored);
      setStatus('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const startBill = useCallback(
    (bill: Bill) => {
      setBills((prev) => {
        // Defensive: the UI should never let this happen (Home hides "New bill" while one is
        // open), but silently ignoring a second one is safer than the two-open-bills state that
        // would follow from trusting the caller.
        if (prev.some((b) => b.state === 'open')) return prev;
        const next = [bill, ...prev];
        if (userId) void writeBills(userId, next);
        return next;
      });
    },
    [userId],
  );

  const markChunk = useCallback(
    (index: number, chunkStatus: ChunkStatus) => {
      setBills((prev) => {
        const next = prev.map((b) => (b.state === 'open' ? setChunkStatus(b, index, chunkStatus) : b));
        if (userId) void writeBills(userId, next);
        return next;
      });
    },
    [userId],
  );

  const closeActiveBill = useCallback(() => {
    setBills((prev) => {
      const next = prev.map((b) => (b.state === 'open' ? closeBill(b) : b));
      if (userId) void writeBills(userId, next);
      return next;
    });
  }, [userId]);

  const cancelActiveBill = useCallback(() => {
    setBills((prev) => {
      const next = prev.map((b) => (b.state === 'open' ? cancelBill(b) : b));
      if (userId) void writeBills(userId, next);
      return next;
    });
  }, [userId]);

  const activeBill = useMemo(() => bills.find((b) => b.state === 'open') ?? null, [bills]);

  const value = useMemo(
    () => ({ status, bills, activeBill, startBill, markChunk, closeActiveBill, cancelActiveBill }),
    [status, bills, activeBill, startBill, markChunk, closeActiveBill, cancelActiveBill],
  );

  return <MerchantBillsContext.Provider value={value}>{children}</MerchantBillsContext.Provider>;
}

export function useMerchantBills() {
  const context = useContext(MerchantBillsContext);
  if (!context) throw new Error('useMerchantBills must be used inside <MerchantBillsProvider>');
  return context;
}
