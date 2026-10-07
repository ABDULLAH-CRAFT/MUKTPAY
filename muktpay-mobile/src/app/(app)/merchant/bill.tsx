import { useEffect } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AmountDisplay, MuktButton, MuktCard, MuktHeader, SplitCard } from '@/components';
import { useBill, useCancelBill, useSetChunkStatus } from '@/features/merchant/useBills';
import { getApiErrorMessage } from '@/lib/apiError';
import { colors, layout, spacing, text } from '@/theme/theme';
import { canCancelBill, isCancelled, isSettled, nextPendingChunk, paidPaise } from '@/types/bill';
import { formatPaise } from '@/utils/money';
import { BillActivity } from '@/features/merchant/BillActivity';
import { QrPanel } from '@/features/merchant/QrPanel';

/**
 * The counter screen: show one QR, wait for the customer to pay it, mark it, show the next.
 *
 * Only one code is shown at a time on purpose. A customer looking at four QR codes will scan
 * whichever is nearest, pay one twice, or skip one — and with no payment callback (see below)
 * the merchant has no way to notice. One at a time makes the sequence self-evident.
 *
 * The bill lives on the server (identified by `ref`, passed as a route param), so leaving this
 * screen loses nothing: it stays in history for the merchant to come back to.
 */
export default function BillScreen() {
  const router = useRouter();
  const { ref: refParam } = useLocalSearchParams<{ ref?: string | string[] }>();
  const ref = Array.isArray(refParam) ? refParam[0] : refParam;

  const { data: bill, isLoading, isError, error } = useBill(ref);
  const setChunkStatus = useSetChunkStatus(ref ?? '');
  const cancelBill = useCancelBill(ref ?? '');

  const goHome = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // Landing here with no ref means a reload or a bad deep link. Nothing to show; go back.
  useEffect(() => {
    if (!ref) router.replace('/');
  }, [ref, router]);

  if (!ref) return null;

  if (isLoading) {
    return (
      <View style={styles.page}>
        <MuktHeader title="Bill" onBack={goHome} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (isError || !bill) {
    return (
      <View style={styles.page}>
        <MuktHeader title="Bill" onBack={goHome} />
        <View style={styles.body}>
          <MuktCard variant="flat">
            <Text style={text('bodyStrong', colors.danger)}>
              {getApiErrorMessage(error) || 'Bill not found'}
            </Text>
          </MuktCard>
          <MuktButton title="Back" onPress={goHome} />
        </View>
      </View>
    );
  }

  const collected = paidPaise(bill);
  const current = nextPendingChunk(bill);
  const settled = isSettled(bill);
  const cancelled = isCancelled(bill);
  const expired = bill.status === 'expired';
  const lastPaid = [...bill.chunks].reverse().find((c) => c.status === 'paid') ?? null;
  const busy = setChunkStatus.isPending || cancelBill.isPending;
  const actionError = setChunkStatus.isError
    ? setChunkStatus.error
    : cancelBill.isError
      ? cancelBill.error
      : null;

  const confirmCancel = () =>
    Alert.alert(
      'Cancel this bill?',
      "It will stop being tracked here. A QR code the customer already has will still work in their UPI app, so don't take payment against it.",
      [
        { text: 'Keep bill', style: 'cancel' },
        { text: 'Cancel bill', style: 'destructive', onPress: () => cancelBill.mutate() },
      ],
    );

  return (
    <View style={styles.page}>
      <MuktHeader
        title={formatPaise(bill.totalPaise)}
        subtitle={bill.note ? `Ref ${bill.ref} · ${bill.note}` : `Ref ${bill.ref}`}
        onBack={goHome}
      />

      <ScrollView contentContainerStyle={styles.body}>
        <MuktCard padding="md">
          <View style={styles.progressHead}>
            <Text style={text('label', colors.textSecondary)}>MARKED AS PAID</Text>
            <Text style={text('label', colors.textSecondary)}>
              {bill.chunks.filter((c) => c.status === 'paid').length} of {bill.chunks.length} payments
            </Text>
          </View>

          <View style={styles.progressRow}>
            <AmountDisplay amountPaise={collected} size="lg" tone={settled ? 'success' : 'default'} />
            <Text style={text('body', colors.textSecondary)}>
              of {formatPaise(bill.totalPaise)}
            </Text>
          </View>
        </MuktCard>

        {cancelled ? (
          <MuktCard>
            <Text style={text('h2', colors.danger)}>Bill cancelled</Text>
            <Text style={[text('body', colors.textSecondary), styles.mt]}>
              This bill was called off
              {bill.cancelledAt ? ` on ${new Date(bill.cancelledAt).toLocaleString()}` : ''}. It&apos;s kept here as a record
              and can&apos;t be edited.
            </Text>
          </MuktCard>
        ) : settled ? (
          <MuktCard>
            <Text style={text('h2')}>All payments marked as paid</Text>
            <Text style={[text('body', colors.textSecondary), styles.mt]}>
              You marked every part of {bill.ref} as paid. MuktPay doesn&apos;t process or verify UPI
              payments, so check your bank app or passbook before the customer leaves.
            </Text>
          </MuktCard>
        ) : current ? (
          <View style={styles.current}>
            <BillActivity billRef={bill.ref} />

            {expired ? (
              <MuktCard padding="md" variant="inset">
                <Text style={text('label', colors.warning)}>EXPIRED</Text>
                <Text style={[text('caption', colors.textSecondary), styles.mt]}>
                  Nothing was marked paid within 24 hours. A QR the customer already has can still work, so only
                  mark a payment as paid if you actually see the money.
                </Text>
              </MuktCard>
            ) : null}

            <QrPanel
              shopName={bill.shopName}
              vpa={bill.vpa}
              amountPaise={current.amountPaise}
              partLabel={`Payment ${current.index} of ${bill.chunks.length}`}
              reference={`${bill.ref} ${current.index}/${bill.chunks.length}`}
              upiUrl={current.upiUrl}
            >
              <MuktButton
                title="Mark as paid"
                loading={setChunkStatus.isPending}
                disabled={busy}
                onPress={() => setChunkStatus.mutate({ index: current.index, status: 'paid' })}
              />
            </QrPanel>
          </View>
        ) : null}

        {lastPaid && !cancelled ? (
          <MuktButton
            title={`Undo payment ${lastPaid.index}`}
            variant="ghost"
            loading={setChunkStatus.isPending}
            disabled={busy}
            onPress={() => setChunkStatus.mutate({ index: lastPaid.index, status: 'pending' })}
          />
        ) : null}

        {actionError ? (
          <MuktCard variant="flat">
            <Text style={text('bodyStrong', colors.danger)}>
              {getApiErrorMessage(actionError)}
            </Text>
          </MuktCard>
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
              highlighted={!cancelled && current?.index === chunk.index}
            />
          ))}
        </View>

        <MuktCard padding="md" variant="inset">
          <Text style={text('label', colors.warning)}>HOW PAYMENT WORKS</Text>
          <Text style={[text('caption', colors.textSecondary), styles.mt]}>
            The customer pays in their own UPI app. MuktPay only shows the QR code and can&apos;t see or
            verify the payment, so &quot;Mark as paid&quot; is your own record, not a receipt.
          </Text>
        </MuktCard>

        {canCancelBill(bill) ? (
          <MuktButton
            title="Cancel bill"
            variant="ghost"
            loading={cancelBill.isPending}
            disabled={busy}
            onPress={confirmCancel}
          />
        ) : null}

        <MuktButton
          title={settled || cancelled ? 'Done' : 'Leave for now'}
          variant={settled || cancelled ? 'primary' : 'ghost'}
          // The bill stays saved either way — nothing to lose by leaving. Resume it from history.
          onPress={goHome}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  progressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  current: {
    gap: spacing.lg,
    alignItems: 'center',
  },
  centered: {
    textAlign: 'center',
  },
  list: {
    gap: spacing.md,
  },
  mt: {
    marginTop: spacing.xs,
  },
});