import * as SecureStore from 'expo-secure-store';

/**
 * Tokens live in the OS keychain (iOS Keychain / Android Keystore), never in plain
 * AsyncStorage. A memory copy avoids hitting the keychain on every request.
 */
const ACCESS_KEY = 'muktpay.accessToken';
const REFRESH_KEY = 'muktpay.refreshToken';

let access: string | null = null;
let refresh: string | null = null;
let loaded = false;

async function read(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null; // corrupted / unavailable keychain → behave as logged out
  }
}

async function load() {
  if (loaded) return;
  [access, refresh] = await Promise.all([read(ACCESS_KEY), read(REFRESH_KEY)]);
  loaded = true;
}

export async function getAccessToken() {
  await load();
  return access;
}

export async function getRefreshToken() {
  await load();
  return refresh;
}

export async function setTokens(accessToken: string, refreshToken: string) {
  access = accessToken;
  refresh = refreshToken;
  loaded = true;
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
  ]);
}

export async function clearTokens() {
  access = null;
  refresh = null;
  loaded = true;
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => {}),
  ]);
}
