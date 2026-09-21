import * as SecureStore from 'expo-secure-store';
import { MERCHANT_PROFILE_VERSION, type MerchantProfile, type StoredMerchantProfile } from '@/types/merchant';

/**
 * The merchant's own shop details, stored per user id on this device.
 *
 * SecureStore rather than plain storage: a VPA is the merchant's money address, and on a shared
 * or stolen phone it shouldn't be readable by anything but this app. It is also small — well
 * under the ~2 KB per-item size Android's keystore is comfortable with.
 *
 * When merchant accounts become real on the server, this file becomes a cache of what the
 * server says rather than the source of truth.
 */

const PREFIX = 'muktpay.merchant.';

/** SecureStore keys may only contain letters, digits, ".", "-" and "_". */
const keyFor = (userId: string) => `${PREFIX}${userId.replace(/[^A-Za-z0-9._-]/g, '_')}`;

const isProfile = (value: unknown): value is MerchantProfile => {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Partial<MerchantProfile>;
  return typeof p.shopName === 'string' && p.shopName.length > 0 && typeof p.vpa === 'string' && p.vpa.includes('@');
};

/** The saved profile, or null when there is none (or the stored blob is unusable). */
export async function readMerchantProfile(userId: string): Promise<MerchantProfile | null> {
  try {
    const raw = await SecureStore.getItemAsync(keyFor(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredMerchantProfile>;
    // An older or newer schema is treated as "no profile" rather than guessed at: re-asking the
    // merchant for two fields is cheaper than generating QR codes from fields we misread.
    if (parsed.version !== MERCHANT_PROFILE_VERSION) return null;
    return isProfile(parsed.profile) ? parsed.profile : null;
  } catch {
    return null;
  }
}

export async function writeMerchantProfile(userId: string, profile: MerchantProfile): Promise<void> {
  const payload: StoredMerchantProfile = { version: MERCHANT_PROFILE_VERSION, profile };
  await SecureStore.setItemAsync(keyFor(userId), JSON.stringify(payload)).catch(() => {});
}

export async function clearMerchantProfile(userId: string): Promise<void> {
  await SecureStore.deleteItemAsync(keyFor(userId)).catch(() => {});
}
