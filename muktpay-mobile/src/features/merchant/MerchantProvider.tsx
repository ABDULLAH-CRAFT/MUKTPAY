import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { api } from '@/lib/api';
import type { MerchantProfile, UpsertMerchantProfileInput } from '@/types/merchant';

type MerchantStatus = 'loading' | 'ready';

interface MerchantContextValue {
  status: MerchantStatus;
  /** null = this merchant hasn't set up their shop yet, so the app shows onboarding. */
  profile: MerchantProfile | null;
  saveProfile: (input: UpsertMerchantProfileInput) => Promise<void>;
  clearProfile: () => Promise<void>;
}

const MerchantContext = createContext<MerchantContextValue | null>(null);

const PROFILE_QUERY_KEY = ['merchant-profile'];

async function fetchProfile(): Promise<MerchantProfile | null> {
  try {
    const { data } = await api.get<MerchantProfile>('/merchant/profile');
    return data;
  } catch (error) {
    // No shop saved yet is a normal state, not a failure: show onboarding, don't error out.
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

/**
 * The shop name + UPI ID every generated QR code is built from.
 *
 * Previously read/written to Expo SecureStore, keyed by user id, per device. Now it's a plain
 * server record: GET/PUT/DELETE /merchant/profile, cached by TanStack Query and cleared
 * automatically on logout (AuthProvider clears the whole query cache on sign-out).
 */
export function MerchantProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useQuery({ queryKey: PROFILE_QUERY_KEY, queryFn: fetchProfile });

  const saveMutation = useMutation({
    mutationFn: (input: UpsertMerchantProfileInput) => api.put<MerchantProfile>('/merchant/profile', input).then((r) => r.data),
    onSuccess: (next) => queryClient.setQueryData(PROFILE_QUERY_KEY, next),
  });

  const clearMutation = useMutation({
    mutationFn: () => api.delete('/merchant/profile'),
    onSuccess: () => queryClient.setQueryData(PROFILE_QUERY_KEY, null),
  });

  const saveProfile = useCallback(
    async (input: UpsertMerchantProfileInput) => {
      await saveMutation.mutateAsync(input);
    },
    [saveMutation],
  );

  const clearProfile = useCallback(async () => {
    await clearMutation.mutateAsync();
  }, [clearMutation]);

  const value = useMemo<MerchantContextValue>(
    () => ({ status: isLoading ? 'loading' : 'ready', profile: profile ?? null, saveProfile, clearProfile }),
    [isLoading, profile, saveProfile, clearProfile],
  );

  return <MerchantContext.Provider value={value}>{children}</MerchantContext.Provider>;
}

export function useMerchant() {
  const context = useContext(MerchantContext);
  if (!context) throw new Error('useMerchant must be used inside <MerchantProvider>');
  return context;
}
