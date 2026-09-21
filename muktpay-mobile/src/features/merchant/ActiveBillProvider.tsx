import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Bill, ChunkStatus } from '@/types/bill';
import { setChunkStatus } from './billFactory';

interface ActiveBillContextValue {
  bill: Bill | null;
  startBill: (bill: Bill) => void;
  markChunk: (index: number, status: ChunkStatus) => void;
  closeBill: () => void;
}

const ActiveBillContext = createContext<ActiveBillContextValue | null>(null);

/**
 * The one bill currently being collected. In memory only: it survives navigating between the
 * bill screen and the dashboard, but not a force-quit. Phase 5 puts a store behind this same
 * interface, so nothing that consumes it has to change.
 */
export function ActiveBillProvider({ children }: { children: ReactNode }) {
  const [bill, setBill] = useState<Bill | null>(null);

  const startBill = useCallback((next: Bill) => setBill(next), []);
  const closeBill = useCallback(() => setBill(null), []);

  const markChunk = useCallback(
    (index: number, status: ChunkStatus) => setBill((current) => (current ? setChunkStatus(current, index, status) : current)),
    [],
  );

  const value = useMemo(() => ({ bill, startBill, markChunk, closeBill }), [bill, startBill, markChunk, closeBill]);
  return <ActiveBillContext.Provider value={value}>{children}</ActiveBillContext.Provider>;
}

export function useActiveBill() {
  const context = useContext(ActiveBillContext);
  if (!context) throw new Error('useActiveBill must be used inside <ActiveBillProvider>');
  return context;
}
