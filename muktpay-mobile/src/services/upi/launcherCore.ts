import type { UpiPayment } from './types';
import { buildUpiLink, InvalidPaymentError, type UpiScheme } from './upiUri';

/** Kept free of React Native imports so it can be unit-tested. upiLauncher.ts wires in Linking. */
export type UpiAppId = 'any' | 'phonepe' | 'gpay' | 'paytm';

export interface LaunchOptions {
  amountPaise: number;
  note?: string;
  /** iOS only. Android always uses the system chooser ("any"). */
  app?: UpiAppId;
}

export type LaunchFailure = 'INVALID_PAYMENT' | 'NO_UPI_APP' | 'UNSUPPORTED_PLATFORM';

export type LaunchResult =
  | { ok: true; scheme: UpiScheme; url: string; preservedOriginal: boolean }
  | { ok: false; reason: LaunchFailure; message: string };

export interface LauncherDeps {
  os: 'ios' | 'android' | 'other';
  openURL: (url: string) => Promise<unknown>;
}

const IOS_TRY_ORDER: UpiScheme[] = ['phonepe', 'gpay', 'paytm', 'upi'];

export function createUpiLauncher(deps: LauncherDeps) {
  return async function launchUpiPayment(payment: UpiPayment, options: LaunchOptions): Promise<LaunchResult> {
    // Browsers and other platforms have no UPI app to hand off to. Say so instead of pretending to open one.
    if (deps.os === 'other') {
      return {
        ok: false,
        reason: 'UNSUPPORTED_PLATFORM',
        message:
          "UPI apps can't be opened from this device or browser. Open MuktPay on your phone, or scan the shop's QR code with your UPI app.",
      };
    }

    const wanted = options.app ?? 'any';

    let schemes: UpiScheme[];
    if (deps.os === 'ios') schemes = wanted === 'any' ? IOS_TRY_ORDER : [wanted];
    else schemes = ['upi']; // Android: one generic link, the OS lists the installed UPI apps

    for (const scheme of schemes) {
      let link;
      try {
        link = buildUpiLink(payment, { amountPaise: options.amountPaise, note: options.note, scheme });
      } catch (error) {
        if (error instanceof InvalidPaymentError) {
          return { ok: false, reason: 'INVALID_PAYMENT', message: error.message };
        }
        throw error;
      }

      try {
        await deps.openURL(link.url);
        return { ok: true, scheme, url: link.url, preservedOriginal: link.preservedOriginal };
      } catch {
        // this app isn't installed / can't handle the link: try the next one
      }
    }

    return {
      ok: false,
      reason: 'NO_UPI_APP',
      message:
        "We couldn't open your UPI app. Make sure PhonePe, Google Pay, Paytm or another UPI app is installed, or scan the shop's QR code from inside your UPI app.",
    };
  };
}