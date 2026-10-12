import Constants from 'expo-constants';
import { resolveApiConfig } from './apiConfigCore';

/**
 * EXPO_PUBLIC_* values are inlined at build time, so this must read
 * `process.env.EXPO_PUBLIC_API_URL` literally (no destructuring).
 */
export const API_CONFIG = resolveApiConfig({
  explicitUrl: process.env.EXPO_PUBLIC_API_URL,
  devHost: Constants.expoConfig?.hostUri?.split(':')[0],
  isDev: __DEV__,
});

if (API_CONFIG.error) {
  console.error(`[MuktPay config] ${API_CONFIG.error}`);
}