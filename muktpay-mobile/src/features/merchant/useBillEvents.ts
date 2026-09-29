import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type BillEventType =
  | 'bill_created'
  | 'chunk_marked_paid'
  | 'chunk_marked_pending'
  | 'bill_settled'
  | 'bill_reopened'
  | 'bill_cancelled'
  | 'bill_expired';

export interface BillEvent {
  id: string;
  type: BillEventType;
  /** Null for system events such as expiry. */
  actorId: string | null;
  chunkIndex: number | null;
  amountPaise: number | null;
  createdAt: string;
}

/**
 * The bill's history, newest first. The key sits under ['bills', …] on purpose: every mutation in
 * useBills.ts already invalidates ['bills'], so this refreshes itself after each change.
 */
export const useBillEvents = (ref: string | undefined) =>
  useQuery({
    queryKey: ['bills', 'events', ref ?? ''],
    queryFn: async () => (await api.get<BillEvent[]>(`/bills/${ref}/events`)).data,
    enabled: !!ref,
  });