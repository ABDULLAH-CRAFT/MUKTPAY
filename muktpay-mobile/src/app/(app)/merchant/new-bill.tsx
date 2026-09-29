import { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AmountDisplay, MuktButton, MuktCard, MuktHeader, MuktInput, SplitCard } from '@/components';
import { useCreateBill } from '@/features/merchant/useBills';
import { useMerchant } from '@/features/merchant/MerchantProvider';
import {
  CAP_PRESETS,
  DEFAULT_CAP_PAISE,
  DEFAULT_SPLIT_RULES,
  planSplit,
  type SplitRules,
} from '@/features/merchant/splitEngine';
import { getApiErrorMessage } from '@/lib/apiError';
import { newIdempotencyKey } from '@/lib/idempotency';
import { colors, layout, spacing, text } from '@/theme/theme';
import type { SplitStrategy } from '@/types/split';
import { formatPaise, parseRupeesToPaise } from '@/utils/money';

const STRATEGY_LABEL: Record<SplitStrategy, { title: string; blurb: string }> = {
  greedy: { title: 'Fill each QR', blurb: 'Every payment at the cap, the remainder last. Fewest scans.' },
  balanced: { title: 'Equal amounts', blurb: 'Same amount each time. Easier for the customer to follow.' },
};

const NOTE_MAX = 60;

export default function NewBillScreen() {
  const router = useRouter();
  const { profile } = useMerchant();
  const createBill = useCreateBill();

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [capPaise, setCapPaise] = useState(DEFAULT_CAP_PAISE);
  const [strategy, setStrategy] = useState<SplitStrategy>('greedy');
  const [touched, setTouched] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const totalPaise = amount.trim() ? parseRupeesToPaise(amount) : null;

  // Instant, offline preview — the same split rules the server will apply, computed locally so
  // there's no network round-trip while the merchant is still typing the amount. The server
  // recomputes this itself when the bill is actually created, so the two can never disagree.
  const result = useMemo(() => {
    if (totalPaise === null) return null;
    const rules: SplitRules = { ...DEFAULT_SPLIT_RULES, maxChunkPaise: capPaise, strategy };
    return planSplit(totalPaise, rules);
  }, [totalPaise, capPaise, strategy]);

  const amountError =
    touched && amount.trim() && totalPaise === null ? 'Enter an amount like 4500 or 4500.50' : undefined;
  const planError = result && !result.ok ? result.message : undefined;
  const plan = result?.ok ? result.value : null;

  // One key per *attempt*. A retry of the same bill (double-tap, a dropped connection, or the API
  // client replaying a request after a token refresh) reuses it, so the server hands back the bill
  // it already made instead of creating a second. Changing any field starts a new attempt.
  const attempt = useRef<{ key: string; fingerprint: string } | null>(null);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const generate = async () => {
    if (!plan || !profile || totalPaise === null || createBill.isPending) return;
    setSubmitError(null);

    const trimmedNote = note.trim();
    const fingerprint = `${totalPaise}|${capPaise}|${strategy}|${trimmedNote}`;
    const current =
      attempt.current?.fingerprint === fingerprint ? attempt.current : { key: newIdempotencyKey(), fingerprint };
    attempt.current = current;

    try {
      const bill = await createBill.mutateAsync({
        totalPaise,
        capPaise,
        strategy,
        note: trimmedNote || undefined,
        idempotencyKey: current.key,
      });
      // Done. Coming back and pressing "Generate" again is a deliberate second bill, so it gets a fresh key.
      attempt.current = null;
      router.push({ pathname: '/merchant/bill', params: { ref: bill.ref } });
    } catch (error) {
      // Keep the key: if the request actually reached the server, retrying returns that same bill.
      setSubmitError(getApiErrorMessage(error));
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <View style={styles.page}>
        <MuktHeader title="New bill" subtitle={profile?.shopName} onBack={goBack} />

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <MuktInput
            label="Total amount"
            value={amount}
            onChangeText={setAmount}
            onBlur={() => setTouched(true)}
            error={amountError}
            helper="What the customer owes in total"
            placeholder="4500"
            keyboardType="decimal-pad"
            returnKeyType="next"
            left={<Text style={text('h3', colors.textSecondary)}>₹</Text>}
          />

          <MuktInput
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            helper="For your own reference — searchable later in history"
            placeholder="Ramesh, order 12"
            maxLength={NOTE_MAX}
            returnKeyType="done"
          />

          <View style={styles.group}>
            <Text style={text('label', colors.textSecondary)}>CUSTOMER&apos;S PER-PAYMENT CAP</Text>
            <View style={styles.chips}>
              {CAP_PRESETS.map((preset) => (
                <MuktButton
                  key={preset.capPaise}
                  title={preset.label}
                  variant={preset.capPaise === capPaise ? 'primary' : 'secondary'}
                  size="md"
                  fullWidth={false}
                  onPress={() => setCapPaise(preset.capPaise)}
                />
              ))}
            </View>
            <Text style={text('caption', colors.textSecondary)}>
              Each QR is capped at {formatPaise(capPaise)}, just under the limit their app enforces.
            </Text>
          </View>

          <View style={styles.group}>
            <Text style={text('label', colors.textSecondary)}>HOW TO SPLIT</Text>
            <View style={styles.chips}>
              {(Object.keys(STRATEGY_LABEL) as SplitStrategy[]).map((key) => (
                <MuktButton
                  key={key}
                  title={STRATEGY_LABEL[key].title}
                  variant={key === strategy ? 'primary' : 'secondary'}
                  size="md"
                  fullWidth={false}
                  onPress={() => setStrategy(key)}
                />
              ))}
            </View>
            <Text style={text('caption', colors.textSecondary)}>{STRATEGY_LABEL[strategy].blurb}</Text>
          </View>

          {planError ? (
            <MuktCard variant="flat">
              <Text accessibilityLiveRegion="polite" style={text('bodyStrong', colors.danger)}>
                {planError}
              </Text>
            </MuktCard>
          ) : null}

          {submitError ? (
            <MuktCard variant="flat">
              <Text accessibilityLiveRegion="polite" style={text('bodyStrong', colors.danger)}>
                {submitError}
              </Text>
            </MuktCard>
          ) : null}

          {plan ? (
            <View style={styles.group}>
              <View style={styles.previewHead}>
                <Text style={text('h3')}>
                  {plan.chunkCount === 1 ? '1 payment' : `${plan.chunkCount} payments`}
                </Text>
                <AmountDisplay amountPaise={plan.totalPaise} size="md" tone="primary" />
              </View>

              {plan.chunks.map((chunk) => (
                <SplitCard
                  key={chunk.index}
                  marker={String(chunk.index)}
                  label={`Payment ${chunk.index} of ${plan.chunkCount}`}
                  amountPaise={chunk.amountPaise}
                  status="pending"
                />
              ))}

              {plan.chunkCount === 1 ? (
                <Text style={text('caption', colors.textSecondary)}>
                  This fits under the cap, so it&apos;s a single QR — no splitting needed.
                </Text>
              ) : null}
            </View>
          ) : null}

          <MuktButton
            title="Generate QR codes"
            loading={createBill.isPending}
            disabled={!plan || !profile}
            onPress={() => void generate()}
          />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  page: { flex: 1 },
  body: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.xxxl, gap: spacing.xl },
  group: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  previewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});