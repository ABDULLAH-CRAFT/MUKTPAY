import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import type { MerchantProfile } from '@/types/merchant';
import { clearMerchantProfile, readMerchantProfile, writeMerchantProfile } from './merchantStorage';

type MerchantStatus = 'loading' | 'ready';

interface MerchantContextValue {
  status: MerchantStatus;
  /** null = this merchant hasn't set up their shop yet, so the app shows onboarding. */
  profile: MerchantProfile | null;
  saveProfile: (profile: MerchantProfile) => Promise<void>;
  clearProfile: () => Promise<void>;
}

const MerchantContext = createContext<MerchantContextValue | null>(null);

/** Holds the shop name + UPI ID that every generated QR code will be built from. */
export function MerchantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [status, setStatus] = useState<MerchantStatus>('loading');
  const [profile, setProfile] = useState<MerchantProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setProfile(null);

    if (!userId) {
      setStatus('ready');
      return;
    }

    (async () => {
      const stored = await readMerchantProfile(userId);
      if (cancelled) return;
      setProfile(stored);
      setStatus('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const saveProfile = useCallback(
    async (next: MerchantProfile) => {
      setProfile(next);
      if (userId) await writeMerchantProfile(userId, next);
    },
    [userId],
  );

  const clearProfile = useCallback(async () => {
    setProfile(null);
    if (userId) await clearMerchantProfile(userId);
  }, [userId]);

  const value = useMemo(
    () => ({ status, profile, saveProfile, clearProfile }),
    [status, profile, saveProfile, clearProfile],
  );

  return <MerchantContext.Provider value={value}>{children}</MerchantContext.Provider>;
}

export function useMerchant() {
  const context = useContext(MerchantContext);
  if (!context) throw new Error('useMerchant must be used inside <MerchantProvider>');
  return context;
}
