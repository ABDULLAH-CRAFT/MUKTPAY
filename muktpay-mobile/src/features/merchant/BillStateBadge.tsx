import { StyleSheet, Text, View } from 'react-native';
import { isSettled, type Bill } from '@/types/bill';
import { colors, radius, spacing, text } from '@/theme/theme';

/**
 * A bill-level badge, separate from StatusBadge (which labels one chunk as pending/paid/failed).
 * "Cancelled" needs to read as cancelled, not as the chunk-level "Failed" — a different word for
 * a different kind of status, so this isn't a rename of StatusBadge, it's a distinct one.
 */
export function BillStateBadge({ bill }: { bill: Bill }) {
  const { label, fg, bg } =
    bill.state === 'cancelled'
      ? { label: 'Cancelled', fg: colors.danger, bg: colors.dangerSoft }
      : bill.state === 'closed'
        ? { label: 'Completed', fg: colors.success, bg: colors.successSoft }
        : isSettled(bill)
          ? { label: 'Awaiting confirmation', fg: colors.success, bg: colors.successSoft }
          : { label: 'In progress', fg: colors.info, bg: colors.infoSoft };

  return (
    <View style={[styles.badge, { backgroundColor: bg }]} accessibilityLabel={`Bill status: ${label}`}>
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
