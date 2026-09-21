import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Calls `onReturn` once when the user comes back to MuktPay after leaving it.
 *
 * This is how we know "they've finished in the UPI app". It says nothing about WHETHER the
 * payment succeeded: Linking gives no result. The caller must ask the user (Phase 7) and record
 * the answer as user-confirmed, not verified.
 *
 * Only "background" counts as leaving, because on iOS "inactive" also happens for
 * notification-centre pulls and system dialogs.
 */
export function useReturnFromUpi(active: boolean, onReturn: () => void) {
  const callback = useRef(onReturn);
  callback.current = onReturn;
  const leftApp = useRef(false);

  useEffect(() => {
    if (!active) {
      leftApp.current = false;
      return;
    }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        leftApp.current = true;
      } else if (state === 'active' && leftApp.current) {
        leftApp.current = false;
        callback.current();
      }
    });
    return () => subscription.remove();
  }, [active]);
}
