import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AmountDisplay, MuktButton, MuktCard, MuktHeader, MuktInput } from '@/components';
import { SplitPreviewSection } from '@/features/split/SplitPreviewSection';
import { useReturnFromUpi } from '@/hooks/useReturnFromUpi';
import { buildUpiLink, MAX_UPI_AMOUNT_PAISE, readUpiPayment } from '@/services/upi';
import { launchUpiPayment } from '@/services/upi/upiLauncher';
import { colors, layout, radius, shadows, spacing, text } from '@/theme/theme';
import { formatPaise, parseRupeesToPaise } from '@/utils/money';

export default function ScanResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ payload?: string | string[] }>();
  const payload = Array.isArray(params.payload) ? params.payload[0] : params.payload;

  // Re-validate here: route params are user-controllable (deep links), so never trust them.
  const result = useMemo(() => readUpiPayment(payload ?? ''), [payload]);

  const [typedAmount, setTypedAmount] = useState('');
  // Developer test of the launcher (Phase 5). The real flow arrives with checkout in Phase 7.
  const [launchState, setLaunchState] = useState<'idle' | 'waiting' | 'returned'>('idle');
  const [launchError, setLaunchError] = useState<string | null>(null);
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
        ? 'Enter a valid amount, e.g. 1999 or 1999.50'
        : typedPaise > MAX_UPI_AMOUNT_PAISE
          ? `The most UPI allows is ${formatPaise(MAX_UPI_AMOUNT_PAISE)}`
          : undefined
      : undefined;

  const ready = amountPaise !== null && amountPaise > 0 && !amountError;

  // What we would open, for the developer panel (null until an amount is known).
  const previewUrl = (() => {
    if (!ready || amountPaise === null) return null;
    try {
      return buildUpiLink(payment, { amountPaise }).url;
    } catch {
      return null;
    }
  })();

  const openUpiApp = async () => {
    if (!ready || amountPaise === null) return;
    setLaunchError(null);
    const outcome = await launchUpiPayment(payment, { amountPaise });
    if (outcome.ok) setLaunchState('waiting');
    else setLaunchError(outcome.message);
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
            onChangeText={setTypedAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            left={<Text style={text('bodyStrong', colors.textSecondary)}>₹</Text>}
            error={amountError}
            helper={typedPaise ? `Reads as ${formatPaise(typedPaise, { alwaysShowDecimals: true })}` : 'This QR code has no fixed amount'}
          />
        )}

        {ready && amountPaise !== null && <SplitPreviewSection totalPaise={amountPaise} />}

        <MuktCard variant="inset" padding="md">
          <Text style={text('caption', colors.textSecondary)}>
            Before paying, check that the name and UPI ID above match the shop you are paying.
          </Text>
        </MuktCard>

        {/* Phase 7 (checkout) turns this into the real "Start payment". */}
        <MuktButton title="Start payment: coming next" disabled onPress={() => {}} />

        {__DEV__ && (
          <MuktCard variant="inset">
            <Text style={text('label', colors.primary)}>DEVELOPER TEST · PHASE 5</Text>
            <Text style={[text('caption', colors.textSecondary), styles.mt]}>
              Opens your real UPI app with this payment pre-filled. Nothing is paid unless you confirm
              with your UPI PIN in that app. The sample merchants are fake, so the app will refuse them.
            </Text>
            {previewUrl && (
              <Text selectable style={[text('micro', colors.textSecondary), styles.mt]}>
                {previewUrl}
              </Text>
            )}

            {launchState === 'waiting' && (
              <Text accessibilityLiveRegion="polite" style={[text('bodyStrong', colors.primary), styles.mt]}>
                Waiting for you to come back from the UPI app…
              </Text>
            )}
            {launchState === 'returned' && (
              <View style={[styles.stack, styles.mt]}>
                <Text accessibilityLiveRegion="polite" style={text('bodyStrong')}>
                  Welcome back. Did the payment go through?
                </Text>
                <MuktButton title="Yes, it was paid" size="md" onPress={() => setLaunchState('idle')} />
                <MuktButton title="No / cancelled" size="md" variant="secondary" onPress={() => setLaunchState('idle')} />
                <Text style={text('micro', colors.textSecondary)}>
                  Phase 7 records this answer against the payment. It is the user's word, not proof.
                </Text>
              </View>
            )}
            {launchError && (
              <Text accessibilityLiveRegion="polite" style={[text('label', colors.danger), styles.mt]}>
                {launchError}
              </Text>
            )}

            {launchState === 'idle' && (
              <View style={styles.mt}>
                <MuktButton title="Open in UPI app" variant="secondary" disabled={!ready} onPress={openUpiApp} />
              </View>
            )}
            {launchState === 'waiting' && (
              <View style={styles.mt}>
                <MuktButton title="Cancel" variant="ghost" size="md" onPress={() => setLaunchState('idle')} />
              </View>
            )}
          </MuktCard>
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
});
