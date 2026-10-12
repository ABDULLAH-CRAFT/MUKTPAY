import { useEffect } from 'react';
import type { ErrorBoundaryProps } from 'expo-router';
import { ErrorFallback } from './ErrorFallback';

export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    if (__DEV__) console.error(error); // never show raw error text to users
  }, [error]);

  return (
    <ErrorFallback
      title="Something went wrong"
      message="MuktPay hit an unexpected problem. Please try again. If it keeps happening, close and reopen the app."
      onRetry={() => void retry()}
    />
  );
}