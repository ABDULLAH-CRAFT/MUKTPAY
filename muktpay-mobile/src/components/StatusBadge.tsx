import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, text } from '@/theme/theme';

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed';

const CONFIG: Record<PaymentStatus, { label: string; fg: string; bg: string }> = {
  pending: { label: 'Pending', fg: colors.warning, bg: colors.warningSoft },
  processing: { label: 'Processing', fg: colors.info, bg: colors.infoSoft },
  paid: { label: 'Paid', fg: colors.success, bg: colors.successSoft },
  failed: { label: 'Failed', fg: colors.danger, bg: colors.dangerSoft },
};

/** Always shows a text label, so status is never conveyed by colour alone. */
export function StatusBadge({ status }: { status: PaymentStatus }) {
  const { label, fg, bg } = CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]} accessibilityLabel={`Status: ${label}`}>
      <Text style={text('micro', fg)}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
});
