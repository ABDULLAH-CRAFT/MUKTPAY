import { Linking, Platform } from 'react-native';
import { createUpiLauncher } from './launcherCore';

export type { LaunchOptions, LaunchResult, UpiAppId } from './launcherCore';

/**
 * Opens the user's UPI app with a payment pre-filled.
 * NOTE: Linking.openURL only opens the app. It does NOT tell us whether the payment succeeded.
 * Payment outcome has to be confirmed by the user (or verified later); see Phase 7/8.
 */
export const launchUpiPayment = createUpiLauncher({
  os: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'other',
  openURL: (url) => Linking.openURL(url),
});
