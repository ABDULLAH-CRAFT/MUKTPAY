import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Bill, BillsPage, ChunkStatus, CreateBillInput } from '@/types/bill';

/**
 * Bills are the server's record (see muktpay-backend/src/bills). Creating a bill, paging through
 * history, searching/filtering, marking a chunk paid, cancelling, and the collections summary all
 * go through the API and TanStack Query's cache.
 */

const PAGE_SIZE = 20;
const billKey = (ref: string) => ['bill', ref] as const;

export interface BillsFilter {
  status?: 'open' | 'settled' | 'cancelled' | 'expired';
  /** Matches against ref or note. */
  search?: string;
  from?: string;
  to?: string;
}

/** Every bill matching the filter, newest first, loaded a page at a time. */
export const useBillsInfinite = (filter: BillsFilter = {}) =>
  useInfiniteQuery({
    queryKey: ['bills', 'list', filter],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      (
        await api.get<BillsPage>('/bills', {
          params: { ...filter, cursor: pageParam, limit: PAGE_SIZE },
        })
      ).data,
    getNextPageParam: (lastPage: BillsPage) => lastPage.nextCursor ?? undefined,
  });

/** The most recent bill still being collected, or null once there isn't one. */
export function useLatestOpenBill() {
  const { data, ...rest } = useQuery({
    queryKey: ['bills', 'latest-open'],
    queryFn: async () => {
      const page = (await api.get<BillsPage>('/bills', { params: { status: 'open', limit: 1 } })).data;
      return page.items[0] ?? null;
    },
  });
  return { ...rest, data: data ?? null };
}

export const useBill = (ref: string | undefined) =>
  useQuery({
    queryKey: billKey(ref ?? ''),
    queryFn: async () => (await api.get<Bill>(`/bills/${ref}`)).data,
    enabled: !!ref,
  });

export interface BillsSummary {
  from: string;
  to: string;
  billsCreated: number;
  settledCount: number;
  cancelledCount: number;
  invoicedPaise: number;
  collectedPaise: number;
  billsWithPayment: number;
}

/** Invoiced vs. actually collected for a date range — e.g. "today's collections". */
export const useBillsSummary = (range: { from: string; to: string }) =>
  useQuery({
    queryKey: ['bills', 'summary', range.from, range.to],
    queryFn: async () => (await api.get<BillsSummary>('/bills/summary', { params: range })).data,
  });

export interface CreateBillRequest extends CreateBillInput {
  /** Same key on a retry of the same attempt, so the server returns the bill it already made. */
  idempotencyKey: string;
}

export function useCreateBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ idempotencyKey, ...input }: CreateBillRequest) =>
      (await api.post<Bill>('/bills', input, { headers: { 'Idempotency-Key': idempotencyKey } })).data,
    onSuccess: (bill) => {
      queryClient.setQueryData(billKey(bill.ref), bill);
      void queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });
}

export function useSetChunkStatus(ref: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ index, status }: { index: number; status: ChunkStatus }) =>
      (await api.patch<Bill>(`/bills/${ref}/chunks/${index}`, { status })).data,
    onSuccess: (bill) => {
      queryClient.setQueryData(billKey(ref), bill);
      void queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });
}

export function useCancelBill(ref: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<Bill>(`/bills/${ref}/cancel`)).data,
    onSuccess: (bill) => {
      queryClient.setQueryData(billKey(ref), bill);
      void queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });
}