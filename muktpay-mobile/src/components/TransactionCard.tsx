import { StyleSheet, Text, View } from 'react-native';
import { colors, shadows, spacing, text } from '@/theme/theme';
import { AmountDisplay } from './AmountDisplay';
import { MuktCard } from './MuktCard';
import { StatusBadge, type PaymentStatus } from './StatusBadge';

interface TransactionCardProps {
  merchantName: string;
  /** e.g. "shop@ybl · 12 Sep, 4:30 pm" */
  subtitle?: string;
  totalPaise: number;
  status: PaymentStatus;
  /** e.g. "4 payments". Shown under the amount. */
  detail?: string;
  onPress?: () => void;
}

export function TransactionCard({ merchantName, subtitle, totalPaise, status, detail, onPress }: TransactionCardProps) {
  const initial = merchantName.trim().charAt(0).toUpperCase() || '?';

  return (
    <MuktCard onPress={onPress} accessibilityLabel={`${merchantName}, ${status}`}>
      <View style={styles.row}>
        <View style={[styles.avatar, shadows.inset('sm')]}>
          <Text style={text('h3', colors.primary)}>{initial}</Text>
        </View>

        <View style={styles.middle}>
          <Text style={text('bodyStrong')} numberOfLines={1}>
            {merchantName}
          </Text>
          {subtitle ? (
            <Text style={text('caption', colors.textSecondary)} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.right}>
          <AmountDisplay amountPaise={totalPaise} size="sm" />
          {detail ? <Text style={text('micro', colors.textSecondary)}>{detail}</Text> : null}
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginRight: spacing.md,
  },
  middle: { flex: 1, marginRight: spacing.md },
  right: { alignItems: 'flex-end' },
  badge: { marginTop: spacing.xs },
});
