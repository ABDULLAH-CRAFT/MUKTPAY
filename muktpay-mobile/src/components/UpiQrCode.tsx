import { Component, useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, radius, shadows, spacing, text } from '@/theme/theme';

interface UpiQrCodeProps {
  /** The full `upi://pay?…` string. */
  value: string;
  size?: number;
  /** Dims the code once its payment is done, so the merchant doesn't re-show a paid QR. */
  dimmed?: boolean;
  /**
   * No padding, shadow or rounded tile: just the code on white. Used inside the QR poster, which
   * provides its own white background and whitespace (and is what gets downloaded or printed).
   */
  bare?: boolean;
  /** Called when the QR could not be generated, so the screen can disable Download / Share. */
  onError?: () => void;
}

/** A UPI link is ~150 characters. Anything this long is not a real payment link. */
const MAX_QR_VALUE_LENGTH = 1000;

function QrUnavailable({ size }: { size: number }) {
  return (
    <View style={[styles.fallback, { width: size, height: size }]}>
      <Text style={[text('bodyStrong', colors.danger), styles.centered]}>Couldn&apos;t generate the QR code</Text>
      <Text style={[text('caption', colors.textSecondary), styles.centered]}>
        Use Copy UPI ID or Open UPI App instead.
      </Text>
    </View>
  );
}

/** Catches an exception thrown while the QR is being drawn (bad/oversized data). */
class QrBoundary extends Component<
  { fallback: ReactNode; onError?: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * A UPI QR code on a white tile.
 *
 * White background and black modules are not a style choice: phone cameras read QR codes by
 * contrast, and tinting them to match the app's palette is the single most common reason a
 * code scans slowly or not at all under shop lighting. `ecl="M"` (15% recovery) is the usual
 * trade-off for payment QRs — enough tolerance for a smudged screen without inflating the
 * module count so far that small phones can't render it legibly.
 */
export function UpiQrCode({ value, size = 220, dimmed = false, bare = false, onError }: UpiQrCodeProps) {
  const unusable = !value || value.length > MAX_QR_VALUE_LENGTH;

  useEffect(() => {
    if (unusable) onError?.();
  }, [unusable, onError]);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={unusable ? 'QR code unavailable' : 'UPI QR code — ask the customer to scan this'}
      style={[bare ? styles.bare : [styles.tile, shadows.raised('md')], dimmed && styles.dimmed]}
    >
      {unusable ? (
        <QrUnavailable size={size} />
      ) : (
        // key={value}: a new payment link gets a fresh boundary, so one failure never sticks.
        <QrBoundary key={value} fallback={<QrUnavailable size={size} />} onError={onError}>
          <QRCode value={value} size={size} color="#000000" backgroundColor="#FFFFFF" ecl="M" quietZone={8} />
        </QrBoundary>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignSelf: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },
  bare: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
  },
  dimmed: { opacity: 0.25 },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
  },
  centered: { textAlign: 'center' },
});