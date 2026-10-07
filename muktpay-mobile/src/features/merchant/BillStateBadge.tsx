import { StyleSheet, Text, View } from 'react-native';
import { isCancelled, isSettled, type Bill } from '@/types/bill';
import { colors, radius, spacing, text } from '@/theme/theme';

/**
 * A bill-level badge, separate from StatusBadge (which labels one chunk as pending/paid/failed).
 *
 * The badge describes the overall bill state:
 * - Cancelled
 * - Awaiting confirmation
 * - In progress
 *
 * MuktPay does not receive UPI payment callbacks, so a fully marked bill is
 * "Awaiting confirmation" rather than "Paid".
 */
export function BillStateBadge({ bill }: { bill: Bill }) {
  const { label, fg, bg } =
    isCancelled(bill)
      ? { label: 'Cancelled', fg: colors.danger, bg: colors.dangerSoft }
      : isSettled(bill)
        ? { label: 'Awaiting confirmation', fg: colors.success, bg: colors.successSoft }
        : { label: 'In progress', fg: colors.info, bg: colors.infoSoft };

  return (
    <View
      style={[styles.badge, { backgroundColor: bg }]}
      accessibilityLabel={`Bill status: ${label}`}
    >
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