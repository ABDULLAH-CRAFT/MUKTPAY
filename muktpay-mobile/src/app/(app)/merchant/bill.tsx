import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AmountDisplay, MuktButton, MuktCard, MuktHeader, SplitCard, UpiQrCode } from '@/components';
import { useActiveBill } from '@/features/merchant/ActiveBillProvider';
import { colors, layout, spacing, text } from '@/theme/theme';
import { isSettled, nextPendingChunk, paidPaise } from '@/types/bill';
import { formatPaise } from '@/utils/money';

/**
 * The counter screen: show one QR, wait for the customer to pay it, mark it, show the next.
 *
 * Only one code is shown at a time on purpose. A customer looking at four QR codes will scan
 * whichever is nearest, pay one twice, or skip one — and with no payment callback (see below)
 * the merchant has no way to notice. One at a time makes the sequence self-evident.
 */
export default function BillScreen() {
  const router = useRouter();
  const { bill, markChunk, closeBill } = useActiveBill();

  const goHome = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // Landing here with no bill means a reload or a deep link. Nothing to show; go back.
  useEffect(() => {
    if (!bill) router.replace('/');
  }, [bill, router]);

  if (!bill) return null;

  const collected = paidPaise(bill);
  const current = nextPendingChunk(bill);
  const settled = isSettled(bill);
  const lastPaid = [...bill.chunks].reverse().find((c) => c.status === 'paid') ?? null;

  return (
    <View style={styles.page}>
      <MuktHeader title={formatPaise(bill.totalPaise)} subtitle={`Ref ${bill.ref}`} onBack={goHome} />

      <ScrollView contentContainerStyle={styles.body}>
        <MuktCard padding="md">
          <View style={styles.progressHead}>
            <Text style={text('label', colors.textSecondary)}>COLLECTED</Text>
            <Text style={text('label', colors.textSecondary)}>
              {bill.chunks.filter((c) => c.status === 'paid').length} of {bill.chunks.length}
            </Text>
          </View>
          <View style={styles.progressRow}>
            <AmountDisplay amountPaise={collected} size="lg" tone={settled ? 'success' : 'default'} />
            <Text style={text('body', colors.textSecondary)}>of {formatPaise(bill.totalPaise)}</Text>
          </View>
        </MuktCard>

        {settled ? (
          <MuktCard>
            <Text style={text('h2', colors.success)}>All payments received ✓</Text>
            <Text style={[text('body', colors.textSecondary), styles.mt]}>
              You marked every part of {bill.ref} as paid. Check your bank app or passbook before the
              customer leaves — this app has no way to confirm the money actually arrived.
            </Text>
          </MuktCard>
        ) : current ? (
          <View style={styles.current}>
            <Text style={text('h3')}>
              Payment {current.index} of {bill.chunks.length}
            </Text>
            <AmountDisplay amountPaise={current.amountPaise} size="xl" tone="primary" />
            <UpiQrCode value={current.upiUrl} />
            <Text style={[text('caption', colors.textSecondary), styles.centered]}>
              Ask the customer to scan this in any UPI app. Mark it paid only once you see the money.
            </Text>
            <MuktButton title="Mark as paid" onPress={() => markChunk(current.index, 'paid')} />
          </View>
        ) : null}

        {lastPaid ? (
          <MuktButton
            title={`Undo payment ${lastPaid.index}`}
            variant="ghost"
            onPress={() => markChunk(lastPaid.index, 'pending')}
          />
        ) : null}

        <View style={styles.list}>
          <Text style={text('label', colors.textSecondary)}>ALL PAYMENTS</Text>
          {bill.chunks.map((chunk) => (
            <SplitCard
              key={chunk.index}
              marker={String(chunk.index)}
              label={`Payment ${chunk.index} of ${bill.chunks.length}`}
              sublabel={`${bill.ref} ${chunk.index}/${bill.chunks.length}`}
              amountPaise={chunk.amountPaise}
              status={chunk.status}
              highlighted={current?.index === chunk.index}
            />
          ))}
        </View>

        <MuktCard padding="md" variant="inset">
          <Text style={text('label', colors.warning)}>MANUAL CONFIRMATION</Text>
          <Text style={[text('caption', colors.textSecondary), styles.mt]}>
            A plain UPI QR sends no callback, so &quot;Mark as paid&quot; is your word, not a receipt.
            Real confirmation needs a payment aggregator with dynamic QR and webhooks.
          </Text>
        </MuktCard>

        <MuktButton
          title={settled ? 'Done' : 'Cancel this bill'}
          variant={settled ? 'primary' : 'ghost'}
          onPress={closeBill} // clearing the bill makes the effect above send us home
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.xxxl, gap: spacing.xl },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  progressRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  current: { gap: spacing.lg, alignItems: 'center' },
  centered: { textAlign: 'center' },
  list: { gap: spacing.md },
  mt: { marginTop: spacing.xs },
});
