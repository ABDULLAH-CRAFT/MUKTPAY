import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AmountDisplay, MuktButton, MuktCard, MuktHeader, MuktInput } from '@/components';
import { SplitPreviewSection } from '@/features/split/SplitPreviewSection';
import { useReturnFromUpi } from '@/hooks/useReturnFromUpi';
import { MAX_UPI_AMOUNT_PAISE, readUpiPayment } from '@/services/upi';
import { launchUpiPayment } from '@/services/upi/upiLauncher';
import { colors, layout, radius, shadows, spacing, text } from '@/theme/theme';
import { formatPaise, parseRupeesToPaise } from '@/utils/money';

/**
 * Largest amount opened as ONE UPI payment. Mirrors the backend's default per-payment cap
 * (SPLIT_MAX_TRANCHE_PAISE = 199900). Above it, the screen shows the split plan and one
 * "Open UPI App" button per payment instead.
 */
const SINGLE_PAYMENT_LIMIT_PAISE = 199_900;

const OPEN_FAILED_FALLBACK =
  "We couldn't open your UPI app. Please scan the shop's QR code using your UPI app.";

type LaunchState = 'idle' | 'opening' | 'waiting' | 'returned';

export default function ScanResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ payload?: string | string[] }>();
  const payload = Array.isArray(params.payload) ? params.payload[0] : params.payload;

  // Re-validate here: route params are user-controllable (deep links), so never trust them.
  const result = useMemo(() => readUpiPayment(payload ?? ''), [payload]);

  const [typedAmount, setTypedAmount] = useState('');
  const [launchState, setLaunchState] = useState<LaunchState>('idle');
  const [launchError, setLaunchError] = useState<string | null>(null);
  /** Payment numbers the customer opened in their UPI app. "Opened" is not "paid". */
  const [openedParts, setOpenedParts] = useState<number[]>([]);

  // Linking only tells us the user came back, never whether a payment happened.
  useReturnFromUpi(launchState === 'waiting', () => setLaunchState('returned'));

  if (!result.ok) {
    return (
      <View style={styles.page}>
        <MuktHeader title="Can't use this code" onBack={() => router.back()} />
        <View style={styles.body}>
          <MuktCard variant="flat">
            <Text accessibilityLiveRegion="polite" style={text('bodyStrong', colors.danger)}>
              {result.error.message}
            </Text>
          </MuktCard>
          <MuktButton title="Scan again" onPress={() => router.back()} />
          <MuktButton title="Enter UPI ID manually" variant="secondary" onPress={() => router.replace('/manual-entry')} />
        </View>
      </View>
    );
  }

  const payment = result.value;
  const amountFromQr = payment.amountPaise;
  const typedPaise = typedAmount ? parseRupeesToPaise(typedAmount) : null;
  const amountPaise = amountFromQr ?? typedPaise;

  const amountError =
    amountFromQr === null && typedAmount
      ? typedPaise === null || typedPaise <= 0
        ? 'Enter a valid amount greater than ₹0, e.g. 1999 or 1999.50'
        : typedPaise > MAX_UPI_AMOUNT_PAISE
          ? `The most UPI allows is ${formatPaise(MAX_UPI_AMOUNT_PAISE)}`
          : undefined
      : undefined;

  const ready = amountPaise !== null && amountPaise > 0 && !amountError;
  const needsSplit = ready && amountPaise !== null && amountPaise > SINGLE_PAYMENT_LIMIT_PAISE;
  const launching = launchState === 'opening' || launchState === 'waiting';

  /** Hands the payment to the customer's UPI app. Never marks anything as paid. */
  const openUpiApp = async (amountToPay: number, part?: number) => {
    if (launching) return; // double-tap guard
    setLaunchError(null);
    setLaunchState('opening');

    try {
      const outcome = await launchUpiPayment(payment, { amountPaise: amountToPay });
      if (outcome.ok) {
        if (part !== undefined) setOpenedParts((prev) => (prev.includes(part) ? prev : [...prev, part]));
        setLaunchState('waiting');
      } else {
        setLaunchState('idle');
        setLaunchError(outcome.message);
      }
    } catch {
      setLaunchState('idle');
      setLaunchError(OPEN_FAILED_FALLBACK);
    }
  };

  const onAmountChange = (value: string) => {
    setTypedAmount(value);
    setOpenedParts([]); // the old "opened" markers belonged to a different amount
    setLaunchError(null);
    if (launchState === 'returned') setLaunchState('idle');
  };

  return (
    <View style={styles.page}>
      <MuktHeader title="Merchant detected" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <MuktCard>
          <View style={styles.merchantRow}>
            <View style={[styles.avatar, shadows.inset('sm')]}>
              <Text style={text('h2', colors.primary)}>{payment.payeeName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={text('h3')} numberOfLines={2}>
                {payment.payeeName}
              </Text>
              <Text selectable style={text('bodyStrong', colors.primary)}>
                {payment.payeeVpa}
              </Text>
              {payment.issuer && (
                <Text style={text('caption', colors.textSecondary)}>
                  {payment.issuer.app} · {payment.issuer.bank}
                </Text>
              )}
            </View>
          </View>

          {!payment.nameFromQr && (
            <Text style={[text('caption', colors.warning), styles.mt]}>
              This QR code didn't include a merchant name. Check the UPI ID carefully.
            </Text>
          )}
          {payment.note && (
            <Text style={[text('caption', colors.textSecondary), styles.mt]}>Note: {payment.note}</Text>
          )}
        </MuktCard>

        {amountFromQr !== null ? (
          <MuktCard>
            <Text style={text('label', colors.textSecondary)}>Amount set by the merchant</Text>
            <View style={styles.mt}>
              <AmountDisplay amountPaise={amountFromQr} size="xl" tone="primary" alwaysShowDecimals={amountFromQr % 100 !== 0} />
            </View>
          </MuktCard>
        ) : (
          <MuktInput
            label="Amount to pay"
            value={typedAmount}
            onChangeText={onAmountChange}
            keyboardType="decimal-pad"
            placeholder="0"
            left={<Text style={text('bodyStrong', colors.textSecondary)}>₹</Text>}
            error={amountError}
            helper={typedPaise ? `Reads as ${formatPaise(typedPaise, { alwaysShowDecimals: true })}` : 'This QR code has no fixed amount'}
          />
        )}

        {ready && amountPaise !== null && (
          <SplitPreviewSection
            totalPaise={amountPaise}
            payEachPart={needsSplit}
            onOpenPayment={(partAmount, index) => void openUpiApp(partAmount, index)}
            openedParts={openedParts}
            busy={launching}
          />
        )}

        <MuktCard variant="inset" padding="md">
          <Text style={text('caption', colors.textSecondary)}>
            Check that the name and UPI ID above match the shop you are paying. You&apos;ll complete the payment in your UPI app; MuktPay doesn&apos;t process or hold your money.
          </Text>
        </MuktCard>

        {launchState === 'waiting' && (
          <MuktCard variant="inset" padding="md">
            <Text accessibilityLiveRegion="polite" style={text('bodyStrong', colors.primary)}>
              Complete the payment in your UPI app
            </Text>
            <Text style={[text('caption', colors.textSecondary), styles.mt]}>
              When you&apos;re done, come back to MuktPay. Payment status is handled by your UPI app.
            </Text>
            <View style={styles.mt}>
              <MuktButton title="Didn't open? Try again" variant="ghost" size="md" onPress={() => setLaunchState('idle')} />
            </View>
          </MuktCard>
        )}

        {launchState === 'returned' && (
          <MuktCard variant="inset" padding="md">
            <Text accessibilityLiveRegion="polite" style={text('bodyStrong')}>
              You&apos;re back in MuktPay
            </Text>
            <Text style={[text('caption', colors.textSecondary), styles.mt]}>
              Check your UPI app for the status of this payment. MuktPay can&apos;t see whether it went through.
            </Text>
          </MuktCard>
        )}

        {launchError && (
          <MuktCard variant="flat" padding="md">
            <Text accessibilityLiveRegion="polite" style={text('bodyStrong', colors.danger)}>
              {launchError}
            </Text>
            <Text style={[text('caption', colors.textSecondary), styles.mt]}>
              You can also open your UPI app yourself and pay to the UPI ID shown above.
            </Text>
          </MuktCard>
        )}

        {!needsSplit && (
          <View style={styles.stack}>
            <MuktButton
              title={launchState === 'returned' ? 'Open UPI App again' : 'Open UPI App'}
              loading={launchState === 'opening'}
              disabled={!ready || launchState === 'waiting'}
              onPress={() => {
                if (amountPaise !== null) void openUpiApp(amountPaise);
              }}
            />
            <Text style={[text('caption', colors.textSecondary), styles.centered]}>
              {!ready && amountFromQr === null && !typedAmount
                ? 'Enter an amount to continue.'
                : 'Complete your payment securely in your UPI app.'}
            </Text>
          </View>
        )}

        <MuktButton title="Scan another code" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  body: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.xxxl, gap: spacing.xl },
  merchantRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  mt: { marginTop: spacing.md },
  stack: { gap: spacing.md },
  centered: { textAlign: 'center' },
});