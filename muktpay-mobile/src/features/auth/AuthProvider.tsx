import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, setSessionExpiredHandler } from '@/lib/api';
import { clearTokens, getRefreshToken, setTokens } from '@/lib/tokenStorage';
import type { AuthResponse, User } from '@/types/auth';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);

  const endSession = useCallback(() => {
    queryClient.clear(); // never leak one user's cached data to the next login
    setUser(null);
    setStatus('unauthenticated');
  }, [queryClient]);

  // The API client calls this if a refresh token is definitively rejected (expired/revoked).
  useEffect(() => {
    setSessionExpiredHandler(endSession);
    return () => setSessionExpiredHandler(null);
  }, [endSession]);

  // App start: is there a saved session? Confirm it with the server.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!(await getRefreshToken())) return !cancelled && setStatus('unauthenticated');
      try {
        const { data } = await api.get<User>('/users/me'); // refreshes the access token if needed
        if (cancelled) return;
        setUser(data);
        setStatus('authenticated');
      } catch {
        // Session rejected, or server unreachable. Offline handling is polished in Phase 10.
        if (!cancelled) setStatus('unauthenticated');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startSession = useCallback(async (auth: AuthResponse) => {
    await setTokens(auth.accessToken, auth.refreshToken);
    setUser(auth.user);
    setStatus('authenticated');
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
      await startSession(data);
    },
    [startSession],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const { data } = await api.post<AuthResponse>('/auth/register', { name, email, password });
      await startSession(data);
    },
    [startSession],
  );

  const logout = useCallback(async () => {
    const refreshToken = await getRefreshToken();
    // Best effort: tell the server to revoke it, but log out locally even if we're offline.
    if (refreshToken) await api.post('/auth/logout', { refreshToken }).catch(() => {});
    await clearTokens();
    endSession();
  }, [endSession]);

  const value = useMemo(
    () => ({ status, user, login, register, logout }),
    [status, user, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
