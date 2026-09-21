import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing, text } from '@/theme/theme';
import { AmountDisplay } from './AmountDisplay';
import { MuktCard } from './MuktCard';
import { StatusBadge, type PaymentStatus } from './StatusBadge';

interface SplitCardProps {
  /** Left badge: the tranche number (1, 2, 3...) or a person's initial for group splits. */
  marker: string;
  /** "Payment 1 of 4", or a person's name in a group split. */
  label: string;
  sublabel?: string;
  amountPaise: number;
  status: PaymentStatus;
  /** Ring around the tranche currently being paid. */
  highlighted?: boolean;
  onPress?: () => void;
}

/** One row of a split: a tranche in checkout (Phase 7) or one person's share (Phase 9). */
export function SplitCard({ marker, label, sublabel, amountPaise, status, highlighted, onPress }: SplitCardProps) {
  return (
    <MuktCard
      padding="md"
      elevation="sm"
      onPress={onPress}
      accessibilityLabel={`${label}, ${status}`}
      style={highlighted ? styles.highlight : undefined}
    >
      <View style={styles.row}>
        <View style={[styles.marker, status === 'paid' ? styles.markerPaid : shadows.inset('sm')]}>
          <Text style={text('label', status === 'paid' ? colors.white : colors.primary)}>
            {status === 'paid' ? '✓' : marker}
          </Text>
        </View>

        <View style={styles.middle}>
          <Text style={text('bodyStrong')} numberOfLines={1}>
            {label}
          </Text>
          {sublabel ? <Text style={text('caption', colors.textSecondary)}>{sublabel}</Text> : null}
        </View>

        <View style={styles.right}>
          <AmountDisplay amountPaise={amountPaise} size="sm" tone={status === 'paid' ? 'success' : 'default'} />
          <View style={styles.badge}>
            <StatusBadge status={status} />
          </View>
        </View>
      </View>
    </MuktCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  marker: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginRight: spacing.md,
  },
  markerPaid: { backgroundColor: colors.success },
  middle: { flex: 1, marginRight: spacing.md },
  right: { alignItems: 'flex-end' },
  badge: { marginTop: spacing.xs },
  highlight: { borderWidth: 1.5, borderColor: colors.accent },
});
