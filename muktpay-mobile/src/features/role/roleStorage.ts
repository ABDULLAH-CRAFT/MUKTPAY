import * as SecureStore from 'expo-secure-store';

/**
 * Which side of the app the signed-in person is using.
 *  - customer: scan a QR and pay (the existing flow)
 *  - merchant: collect a bill by handing out split QR codes
 *
 * This is a UI mode, not a permission. The server does not know or care about it yet;
 * when merchant accounts become real (Phase 6+), the server becomes the source of truth
 * and this file turns into a cache of what it says.
 */
export type AppRole = 'customer' | 'merchant';

export const APP_ROLES: readonly AppRole[] = ['customer', 'merchant'];

const PREFIX = 'muktpay.role.';

/** SecureStore keys may only contain letters, digits, ".", "-" and "_". */
const keyFor = (userId: string) => `${PREFIX}${userId.replace(/[^A-Za-z0-9._-]/g, '_')}`;

const isRole = (value: unknown): value is AppRole =>
  typeof value === 'string' && (APP_ROLES as readonly string[]).includes(value);

/** The role this user picked last time, or null if they never have (or the store is unreadable). */
export async function readRole(userId: string): Promise<AppRole | null> {
  try {
    const stored = await SecureStore.getItemAsync(keyFor(userId));
    return isRole(stored) ? stored : null;
  } catch {
    return null; // unreadable keychain → behave as "not chosen yet"
  }
}

export async function writeRole(userId: string, role: AppRole): Promise<void> {
  await SecureStore.setItemAsync(keyFor(userId), role).catch(() => {});
}

export async function clearStoredRole(userId: string): Promise<void> {
  await SecureStore.deleteItemAsync(keyFor(userId)).catch(() => {});
}
