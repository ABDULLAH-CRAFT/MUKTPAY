import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';

interface NetworkContextValue {
  /** false only when the OS says there is no connection / no internet. Unknown counts as online. */
  isOnline: boolean;
}

const NetworkContext = createContext<NetworkContextValue>({ isOnline: true });

const reachable = (state: Network.NetworkState) => state.isConnected !== false && state.isInternetReachable !== false;

/**
 * Tracks connectivity for the offline banner and tells TanStack Query when the network comes
 * back (so screens refetch by themselves). It is informational only: nothing is ever blocked
 * because of it, since the OS can be wrong (captive portals, VPNs).
 */
export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let active = true;
    const apply = (state: Network.NetworkState) => {
      if (!active) return;
      const next = reachable(state);
      setIsOnline(next);
      onlineManager.setOnline(next);
    };

    Network.getNetworkStateAsync().then(apply).catch(() => {});
    const subscription = Network.addNetworkStateListener(apply);

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const value = useMemo(() => ({ isOnline }), [isOnline]);
  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export const useNetwork = () => useContext(NetworkContext);