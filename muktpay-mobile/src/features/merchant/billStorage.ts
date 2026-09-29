import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Bill } from '@/types/bill';
import { capBillList, parseBillList, serializeBillList } from './billListUtils';

/**
 * A merchant's bill history: every bill they've created, on this device, for this account.
 *
 * AsyncStorage rather than SecureStore (used for tokens and the shop profile): bill history can
 * grow into tens or hundreds of records, and Android's Keystore-backed SecureStore is built for
 * small secrets, not a growing business log — some devices reject SecureStore writes past a few
 * KB. Bills aren't credentials; they're records the merchant may want to export or hand to an
 * accountant later, which is a better fit for plain storage than the keychain.
 */

const PREFIX = 'muktpay.bills.';

/** AsyncStorage keys work with most characters, but keep this consistent with the SecureStore keys. */
const keyFor = (userId: string) => `${PREFIX}${userId.replace(/[^A-Za-z0-9._-]/g, '_')}`;

export async function readBills(userId: string): Promise<Bill[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    return parseBillList(raw);
  } catch {
    return []; // unreadable storage → behave as "no history yet"
  }
}

/** Overwrites the whole list. Callers are expected to have already merged their change in. */
export async function writeBills(userId: string, bills: Bill[]): Promise<void> {
  const capped = capBillList(bills);
  await AsyncStorage.setItem(keyFor(userId), serializeBillList(capped)).catch(() => {});
}

export async function clearBills(userId: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(userId)).catch(() => {});
}
