import { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { ErrorFallback } from '@/components/ErrorFallback';
import { OfflineBanner } from '@/components/OfflineBanner';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { NetworkProvider } from '@/features/network/NetworkProvider';
import { API_CONFIG } from '@/lib/config';
import { queryClient } from '@/lib/queryClient';
import { colors } from '@/theme/theme';

// Catches render crashes in any screen and shows a friendly screen with "Try again".
export { RouteErrorBoundary as ErrorBoundary } from '@/components/RouteErrorBoundary';

// Keep the splash screen up until we know whether the user is logged in (no login-screen flash).
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  // A production build without a valid https API URL must fail clearly, not guess a server.
  if (API_CONFIG.error) return <ConfigProblem message={API_CONFIG.error} />;

  return (
    <QueryClientProvider client={queryClient}>
      <NetworkProvider>
        <AuthProvider>
          <RootNavigator />
          <OfflineBanner />
        </AuthProvider>
      </NetworkProvider>
    </QueryClientProvider>
  );
}

function ConfigProblem({ message }: { message: string }) {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <ErrorFallback title="MuktPay isn't set up correctly" message={message} />
    </>
  );
}

function RootNavigator() {
  const { status, retryStartup, logout } = useAuth();
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  if (status === 'loading') return null;

  // Saved session, but the server couldn't be reached/confirmed. Do NOT send a valid user to login.
  if (status === 'unavailable') {
    const onRetry = async () => {
      setRetrying(true);
      try {
        await retryStartup();
      } finally {
        setRetrying(false);
      }
    };

    return (
      <>
        <StatusBar style="dark" />
        <ErrorFallback
          title="Can't reach MuktPay"
          message="We couldn't confirm your session. You're still logged in. Check your internet connection and try again."
          onRetry={() => void onRetry()}
          retrying={retrying}
          secondaryLabel="Log out"
          onSecondary={() => void logout()}
        />
      </>
    );
  }

  const isSignedIn = status === 'authenticated';

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        {/* Protected routes: the router itself refuses to show a group whose guard is false,
            and redirects automatically when the guard flips (login / logout / expired session). */}
        <Stack.Protected guard={isSignedIn}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}