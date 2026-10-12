import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNetwork } from '@/features/network/NetworkProvider';
import { api, setSessionExpiredHandler } from '@/lib/api';
import { classifyError } from '@/lib/errorKind';
import { clearTokens, getRefreshToken, setTokens } from '@/lib/tokenStorage';
import type { AuthResponse, User } from '@/types/auth';

/**
 * unavailable = we have a saved session but the server couldn't be reached (or failed), so we
 * can't confirm it yet. The person is NOT logged out; the app offers Try again.
 */
type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'unavailable';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-checks the saved session (the "Try again" button on the unavailable screen). */
  retryStartup: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { isOnline } = useNetwork();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

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

  // Is there a saved session? Confirm it with the server.
  const bootstrap = useCallback(async () => {
    if (!(await getRefreshToken())) {
      if (mounted.current) setStatus('unauthenticated');
      return;
    }
    try {
      const { data } = await api.get<User>('/users/me'); // refreshes the access token if needed
      if (!mounted.current) return;
      setUser(data);
      setStatus('authenticated');
    } catch (error) {
      if (!mounted.current) return;
      if (classifyError(error) === 'auth') {
        // The server definitively said no (401): this session is over.
        await clearTokens();
        setUser(null);
        setStatus('unauthenticated');
      } else {
        // Offline, timeout, 5xx, rate limit... says nothing about the session. Keep it.
        setStatus('unavailable');
      }
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // When the connection returns while we're stuck on "unavailable", try again automatically.
  const wasOnline = useRef(isOnline);
  useEffect(() => {
    if (isOnline && !wasOnline.current && status === 'unavailable') void bootstrap();
    wasOnline.current = isOnline;
  }, [isOnline, status, bootstrap]);

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
    () => ({ status, user, login, register, logout, retryStartup: bootstrap }),
    [status, user, login, register, logout, bootstrap],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}