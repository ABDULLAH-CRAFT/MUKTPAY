import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { api } from '@/lib/api';
import type { SplitPlan, SplitStrategy } from '@/types/split';

export const useSplitPreview = (totalPaise: number, strategy: SplitStrategy) =>
  useQuery({
    queryKey: ['split-preview', totalPaise, strategy],
    queryFn: async () => (await api.post<SplitPlan>('/split/preview', { totalPaise, strategy })).data,
    staleTime: 5 * 60_000, // same input → same plan (the engine is deterministic)
    // A 400 means "this amount can't be split": retrying can't fix it.
    retry: (failures, error) => !(axios.isAxiosError(error) && error.response?.status === 400) && failures < 1,
  });
