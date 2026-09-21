import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, radius, shadows, spacing } from '@/theme/theme';

interface UpiQrCodeProps {
  /** The full `upi://pay?…` string. */
  value: string;
  size?: number;
  /** Dims the code once its payment is done, so the merchant doesn't re-show a paid QR. */
  dimmed?: boolean;
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
export function UpiQrCode({ value, size = 220, dimmed = false }: UpiQrCodeProps) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="UPI QR code — ask the customer to scan this"
      style={[styles.tile, shadows.raised('md'), dimmed && styles.dimmed]}
    >
      <QRCode value={value} size={size} color="#000000" backgroundColor="#FFFFFF" ecl="M" quietZone={8} />
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
  dimmed: { opacity: 0.25 },
});
