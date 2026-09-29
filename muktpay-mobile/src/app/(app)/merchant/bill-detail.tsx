import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AmountDisplay, MuktButton, MuktCard, MuktHeader, SplitCard } from '@/components';
import { BillStateBadge } from '@/features/merchant/BillStateBadge';
import { useMerchantBills } from '@/features/merchant/MerchantBillsProvider';
import { colors, layout, spacing, text } from '@/theme/theme';
import { paidPaise } from '@/types/bill';
import { formatShortDateTime } from '@/utils/formatDate';
import { formatPaise } from '@/utils/money';

/**
 * Read-only view of a closed or cancelled bill. The interactive screen (bill.tsx) is only ever
 * for the one 'open' bill, so a finished bill needs its own screen rather than reusing that one
 * in some "disabled" mode.
 */
export default function BillDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ref?: string | string[] }>();
  const ref = Array.isArray(params.ref) ? params.ref[0] : params.ref;
  const { bills } = useMerchantBills();
  const bill = bills.find((b) => b.ref === ref) ?? null;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/merchant/history'));

  if (!bill) {
    return (
      <View style={styles.page}>
        <MuktHeader title="Bill not found" onBack={goBack} />
        <View style={styles.body}>
          <MuktButton title="Back to past bills" onPress={goBack} />
        </View>
      </View>
    );
  }

  const collected = paidPaise(bill);

  return (
    <View style={styles.page}>
      <MuktHeader title={formatPaise(bill.totalPaise)} subtitle={`Ref ${bill.ref}`} onBack={goBack} />

      <ScrollView contentContainerStyle={styles.body}>
        <MuktCard>
          <View style={styles.head}>
            <BillStateBadge bill={bill} />
            <Text style={text('caption', colors.textSecondary)}>{formatShortDateTime(bill.createdAt)}</Text>
          </View>
          <View style={[styles.progressRow, styles.mt]}>
            <AmountDisplay amountPaise={collected} size="lg" />
            <Text style={text('body', colors.textSecondary)}>of {formatPaise(bill.totalPaise)} collected</Text>
          </View>
          {bill.endedAt ? (
            <Text style={[text('caption', colors.textSecondary), styles.mt]}>
              {bill.state === 'cancelled' ? 'Cancelled' : 'Completed'} {formatShortDateTime(bill.endedAt)}
            </Text>
          ) : null}
        </MuktCard>

        <View style={styles.list}>
          <Text style={text('label', colors.textSecondary)}>PAYMENTS</Text>
          {bill.chunks.map((chunk) => (
            <SplitCard
              key={chunk.index}
              marker={String(chunk.index)}
              label={`Payment ${chunk.index} of ${bill.chunks.length}`}
              sublabel={`${bill.ref} ${chunk.index}/${bill.chunks.length}`}
              amountPaise={chunk.amountPaise}
              status={chunk.status}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.xxxl, gap: spacing.xl },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  mt: { marginTop: spacing.sm },
  list: { gap: spacing.md },
});
