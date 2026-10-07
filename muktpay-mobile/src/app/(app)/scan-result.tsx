import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AmountDisplay, MuktButton, MuktCard, MuktHeader, MuktInput } from '@/components';
import { SplitPreviewSection } from '@/features/split/SplitPreviewSection';
import { useReturnFromUpi } from '@/hooks/useReturnFromUpi';
import { MAX_UPI_AMOUNT_PAISE, readUpiPayment } from '@/services/upi';
import { launchUpiPayment } from '@/services/upi/upiLauncher';
import { contentColumn, keyboardBehavior } from '@/theme/responsive';
import { colors, radius, shadows, spacing, text } from '@/theme/theme';
import { formatPaise, parseRupeesToPaise } from '@/utils/money';

/**
 * Largest amount opened as ONE UPI payment. Mirrors the backend's default per-payment cap
 * (SPLIT_MAX_TRANCHE_PAISE = 199900). Above it, the screen shows the split plan and one
 * "Open UPI App" button per payment instead.
 */
const SINGLE_PAYMENT_LIMIT_PAISE = 199_900;

const OPEN_FAILED_FALLBACK =
  "We couldn't open your UPI app. Please scan the shop's QR code using your UPI app.";

const NOTICE_MS = 3500;

type LaunchState = 'idle' | 'opening' | 'waiting' | 'returned';
type Notice = { tone: 'ok' | 'error'; message: string };

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
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Linking only tells us the user came back, never whether a payment happened.
  useReturnFromUpi(launchState === 'waiting', () => setLaunchState('returned'));

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const showNotice = (tone: Notice['tone'], message: string) => {
    setNotice({ tone, message });
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_MS);
  };

  if (!result.ok) {
    return (
      <View style={styles.page}>
        <MuktHeader title="Can't use this code" onBack={() => router.back()} />
        <View style={styles.column}>
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
  const initial = payment.payeeName.trim().charAt(0).toUpperCase() || '?';

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

  const copyUpiId = async () => {
    try {
      await Clipboard.setStringAsync(payment.payeeVpa);
      showNotice('ok', 'UPI ID copied.');
    } catch {
      showNotice('error', "Couldn't copy. Please try again.");
    }
  };

  const sharePayee = async () => {
    try {
      const amountLine = amountPaise ? ` for ${formatPaise(amountPaise, { alwaysShowDecimals: true })}` : '';
      await Share.share({
        message: `Pay ${payment.payeeName}${amountLine} on UPI. UPI ID: ${payment.payeeVpa}`,
      });
    } catch {
      showNotice('error', "Couldn't open the share sheet. Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView behavior={keyboardBehavior} style={styles.page}>
      <MuktHeader title="Review payment" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* 1 · Who, and how much */}
        <MuktCard>
          <View style={styles.hero}>
            <View style={[styles.avatar, shadows.inset('sm')]}>
              <Text style={text('h2', colors.primary)}>{initial}</Text>
            </View>
            <Text style={[text('h2'), styles.centered]} numberOfLines={2}>
              {payment.payeeName}
            </Text>
            <Text selectable style={[text('bodyStrong', colors.primary), styles.centered]}>
              {payment.payeeVpa}
            </Text>
            {payment.issuer ? (
              <Text style={[text('caption', colors.textSecondary), styles.centered]}>
                {payment.issuer.app} · {payment.issuer.bank}
              </Text>
            ) : null}
          </View>

          <View style={styles.divider} />

          {amountFromQr !== null ? (
            <View style={styles.amountBlock}>
              <Text style={text('label', colors.textSecondary)}>Amount to pay</Text>
              <AmountDisplay
                amountPaise={amountFromQr}
                size="xl"
                tone="primary"
                alwaysShowDecimals={amountFromQr % 100 !== 0}
              />
              <Text style={text('micro', colors.textSecondary)}>Set by the merchant</Text>
            </View>
          ) : (
            <MuktInput
              label="Amount to pay"
              value={typedAmount}
              onChangeText={onAmountChange}
              keyboardType="decimal-pad"
              placeholder="0"
              left={<Text style={text('bodyStrong', colors.textSecondary)}>₹</Text>}
              error={amountError}
              helper={
                typedPaise
                  ? `Reads as ${formatPaise(typedPaise, { alwaysShowDecimals: true })}`
                  : 'This QR code has no fixed amount'
              }
            />
          )}

          {!payment.nameFromQr ? (
            <Text style={[text('caption', colors.warning), styles.mt]}>
              This QR code didn&apos;t include a merchant name. Check the UPI ID carefully.
            </Text>
          ) : null}
          {payment.note ? (
            <Text style={[text('caption', colors.textSecondary), styles.mt]}>Note: {payment.note}</Text>
          ) : null}
        </MuktCard>

        {/* 2 · The one primary action */}
        {needsSplit && amountPaise !== null ? (
          <SplitPreviewSection
            totalPaise={amountPaise}
            payEachPart
            onOpenPayment={(partAmount, index) => void openUpiApp(partAmount, index)}
            openedParts={openedParts}
            busy={launching}
          />
        ) : (
          <View style={styles.primary}>
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

        {/* 3 · What happened (neutral: MuktPay can't see the payment) */}
        {launchState === 'waiting' ? (
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
        ) : null}

        {launchState === 'returned' ? (
          <MuktCard variant="inset" padding="md">
            <Text accessibilityLiveRegion="polite" style={text('bodyStrong')}>
              You&apos;re back in MuktPay
            </Text>
            <Text style={[text('caption', colors.textSecondary), styles.mt]}>
              Check your UPI app for the status of this payment. MuktPay can&apos;t see whether it went through.
            </Text>
          </MuktCard>
        ) : null}

        {launchError ? (
          <MuktCard variant="flat" padding="md">
            <Text accessibilityLiveRegion="polite" style={text('bodyStrong', colors.danger)}>
              {launchError}
            </Text>
            <Text style={[text('caption', colors.textSecondary), styles.mt]}>
              You can also open your UPI app yourself and pay to the UPI ID shown above.
            </Text>
          </MuktCard>
        ) : null}

        {/* 4 · Secondary actions */}
        <View style={styles.secondary}>
          <View style={styles.row}>
            <View style={styles.cell}>
              <MuktButton title="Copy UPI ID" variant="secondary" size="md" onPress={() => void copyUpiId()} />
            </View>
            <View style={styles.cell}>
              <MuktButton title="Share" variant="secondary" size="md" onPress={() => void sharePayee()} />
            </View>
          </View>
          {notice ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[text('label', notice.tone === 'ok' ? colors.success : colors.danger), styles.centered]}
            >
              {notice.message}
            </Text>
          ) : null}
          <MuktButton title="Scan another QR" variant="ghost" onPress={() => router.back()} />
        </View>

        <MuktCard variant="inset" padding="md">
          <Text style={text('caption', colors.textSecondary)}>
            Check that the name and UPI ID above match the shop you are paying. You&apos;ll complete the payment in
            your UPI app; MuktPay doesn&apos;t process or hold your money.
          </Text>
        </MuktCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  column: { ...contentColumn, gap: spacing.xl },
  body: { ...contentColumn, paddingBottom: spacing.xxxl, gap: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.xs },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.lg },
  amountBlock: { alignItems: 'center', gap: spacing.xs },
  centered: { textAlign: 'center' },
  mt: { marginTop: spacing.md },
  primary: { gap: spacing.md },
  secondary: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  cell: { flex: 1 },
});