import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { clearStoredRole, readRole, writeRole, type AppRole } from './roleStorage';

type RoleStatus = 'loading' | 'ready';

interface RoleContextValue {
  status: RoleStatus;
  /** null = the person has not chosen yet, so the app shows the role picker. */
  role: AppRole | null;
  chooseRole: (role: AppRole) => Promise<void>;
  /** Sends the person back to the picker (the "Switch role" button). */
  resetRole: () => Promise<void>;
}

const RoleContext = createContext<RoleContextValue | null>(null);

/**
 * Remembers whether this person is using MuktPay to pay or to collect.
 * The choice is stored per user id, so two accounts on one phone never inherit
 * each other's mode, and logging out leaves nothing behind for the next person.
 */
export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [status, setStatus] = useState<RoleStatus>('loading');
  const [role, setRole] = useState<AppRole | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setRole(null);

    if (!userId) {
      setStatus('ready');
      return;
    }

    (async () => {
      const stored = await readRole(userId);
      if (cancelled) return;
      setRole(stored);
      setStatus('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const chooseRole = useCallback(
    async (next: AppRole) => {
      setRole(next); // optimistic: the screen should switch instantly, not after a keychain write
      if (userId) await writeRole(userId, next);
    },
    [userId],
  );

  const resetRole = useCallback(async () => {
    setRole(null);
    if (userId) await clearStoredRole(userId);
  }, [userId]);

  const value = useMemo(() => ({ status, role, chooseRole, resetRole }), [status, role, chooseRole, resetRole]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used inside <RoleProvider>');
  return context;
}

export type { AppRole };
