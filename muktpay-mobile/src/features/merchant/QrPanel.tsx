import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { AmountDisplay, MuktButton, UpiQrCode } from '@/components';
import { readUpiPayment } from '@/services/upi';
import { launchUpiPayment } from '@/services/upi/upiLauncher';
import { colors, layout, radius, shadows, spacing, text } from '@/theme/theme';

interface QrPanelProps {
  shopName: string;
  vpa: string;
  amountPaise: number;
  /** e.g. "Payment 2 of 3" */
  partLabel: string;
  /** e.g. "MP7X2K9A 2/3": the same text the customer sees in the payment note. */
  reference: string;
  /** The exact `upi://pay?…` string encoded in the QR. */
  upiUrl: string;
  /** Rendered between the instructions and the extra actions (the "Mark as paid" button). */
  children?: ReactNode;
}

type Feedback = { tone: 'ok' | 'error'; message: string };
type Busy = 'download' | 'share' | 'open' | null;

const MAX_POSTER_WIDTH = 340;
const FEEDBACK_MS = 4000;

/**
 * The merchant's QR screen block: a poster (shop, amount, QR, reference) plus the actions around
 * it. Download and Share capture the poster itself, so the saved/printed image is exactly what is
 * on screen: black code, white background, whitespace all round.
 */
export function QrPanel({ shopName, vpa, amountPaise, partLabel, reference, upiUrl, children }: QrPanelProps) {
  const { width } = useWindowDimensions();
  const posterRef = useRef<View>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  // The poster never exceeds the screen (minus page padding), and the QR fills it minus the poster padding.
  const posterWidth = Math.min(width - layout.screenPadding * 2, MAX_POSTER_WIDTH);
  const qrSize = Math.max(160, posterWidth - spacing.lg * 2);

  const show = (tone: Feedback['tone'], message: string) => {
    setFeedback({ tone, message });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFeedback(null), FEEDBACK_MS);
  };

  const capturePoster = async (): Promise<string> => {
    const node = posterRef.current;
    if (!node) throw new Error('QR is not ready');
    return captureRef(node, { format: 'png', quality: 1, result: 'tmpfile' });
  };

  const copy = async (value: string, okMessage: string) => {
    try {
      await Clipboard.setStringAsync(value);
      show('ok', okMessage);
    } catch {
      show('error', "Couldn't copy. Please try again.");
    }
  };

  const shareQr = async () => {
    if (busy) return;
    setBusy('share');
    try {
      if (!(await Sharing.isAvailableAsync())) {
        show('error', "Sharing isn't available on this device. Try Download QR instead.");
        return;
      }
      const uri = await capturePoster();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share payment QR' });
    } catch {
      show('error', "Couldn't share the QR. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const downloadQr = async () => {
    if (busy) return;
    setBusy('download');
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(true); // write-only access
      if (!permission.granted) {
        show('error', 'Allow access to save the QR to your photos, or use Share QR instead.');
        return;
      }
      const uri = await capturePoster();
      await MediaLibrary.saveToLibraryAsync(uri);
      show('ok', 'QR saved to your photos.');
    } catch {
      show('error', "Couldn't save the QR. Try Share QR instead.");
    } finally {
      setBusy(null);
    }
  };

  /** Hands this exact payment to a UPI app on THIS phone (e.g. a customer paying from your device). */
  const openUpiApp = async () => {
    if (busy) return;
    setBusy('open');
    try {
      const parsed = readUpiPayment(upiUrl);
      if (!parsed.ok || parsed.value.amountPaise === null) {
        show('error', "This QR can't be opened in a UPI app. Ask the customer to scan it instead.");
        return;
      }
      const outcome = await launchUpiPayment(parsed.value, { amountPaise: parsed.value.amountPaise });
      if (!outcome.ok) show('error', outcome.message);
    } catch {
      show('error', "We couldn't open your UPI app. Ask the customer to scan the QR code with their UPI app.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.posterShadow, shadows.raised('md'), { width: posterWidth }]}>
        {/* collapsable={false}: Android otherwise optimises this View away and the capture is blank. */}
        <View ref={posterRef} collapsable={false} style={styles.poster}>
          <Text style={[text('h3'), styles.centered]} numberOfLines={2}>
            {shopName}
          </Text>
          <Text style={[text('caption', colors.textSecondary), styles.centered]}>{partLabel}</Text>
          <AmountDisplay amountPaise={amountPaise} size="xl" tone="primary" />
          <UpiQrCode value={upiUrl} size={qrSize} bare />
          <Text style={[text('label'), styles.centered]}>Scan with any UPI app</Text>
          <Text style={[text('micro', colors.textSecondary), styles.centered]}>Ref {reference}</Text>
        </View>
      </View>

      <Text style={[text('caption', colors.textSecondary), styles.centered]}>
        Ask the customer to scan this in any UPI app and complete the payment there. If scanning doesn&apos;t work,
        they can enter your UPI ID in their UPI app. Mark it as paid only once you see the money in your account.
      </Text>

      {children}

      <View style={styles.actions}>
        <MuktButton
          title="Open UPI App"
          variant="secondary"
          size="md"
          loading={busy === 'open'}
          disabled={busy !== null && busy !== 'open'}
          onPress={() => void openUpiApp()}
        />
        <Text style={[text('micro', colors.textSecondary), styles.centered]}>
          Use &quot;Open UPI App&quot; when the customer pays from this phone.
        </Text>

        <View style={styles.row}>
          <View style={styles.cell}>
            <MuktButton
              title="Download QR"
              variant="secondary"
              size="md"
              loading={busy === 'download'}
              disabled={busy !== null && busy !== 'download'}
              onPress={() => void downloadQr()}
            />
          </View>
          <View style={styles.cell}>
            <MuktButton
              title="Share QR"
              variant="secondary"
              size="md"
              loading={busy === 'share'}
              disabled={busy !== null && busy !== 'share'}
              onPress={() => void shareQr()}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.cell}>
            <MuktButton
              title="Copy UPI ID"
              variant="secondary"
              size="md"
              onPress={() => void copy(vpa, 'UPI ID copied.')}
            />
          </View>
          <View style={styles.cell}>
            <MuktButton
              title="Copy link"
              variant="secondary"
              size="md"
              onPress={() => void copy(upiUrl, 'Payment link copied.')}
            />
          </View>
        </View>

        {feedback ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[text('label', feedback.tone === 'ok' ? colors.success : colors.danger), styles.centered]}
          >
            {feedback.message}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: 'stretch', alignItems: 'center', gap: spacing.lg },
  posterShadow: { alignSelf: 'center', borderRadius: radius.lg, backgroundColor: colors.white },
  poster: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
  },
  centered: { textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  cell: { flex: 1 },
});