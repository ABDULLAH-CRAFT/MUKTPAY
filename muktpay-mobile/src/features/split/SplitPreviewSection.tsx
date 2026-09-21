import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MuktButton, MuktCard, SplitCard } from '@/components';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getApiErrorMessage } from '@/lib/apiError';
import { colors, spacing, text } from '@/theme/theme';
import type { SplitStrategy } from '@/types/split';
import { formatPaise } from '@/utils/money';
import { useSplitPreview } from './useSplitPreview';

/** Shows how a bill will be paid, straight from the server's split engine. */
export function SplitPreviewSection({ totalPaise }: { totalPaise: number }) {
  const [strategy, setStrategy] = useState<SplitStrategy>('greedy');

  // Wait for typing to settle before asking the server.
  const settledTotal = useDebouncedValue(totalPaise, 400);
  const settling = settledTotal !== totalPaise;
  const { data: plan, isLoading, isError, error } = useSplitPreview(settledTotal, strategy);

  // Never display a plan that doesn't add up, even if the server (or a proxy) misbehaves.
  const addsUp = plan ? plan.tranches.reduce((sum, t) => sum + t.amountPaise, 0) === plan.totalPaise : true;

  return (
    <View style={styles.section}>
      <Text style={[text('label', colors.textSecondary), styles.title]}>HOW THIS WILL BE PAID</Text>

      <View style={styles.toggle}>
        <MuktButton
          title="Full payments first"
          size="md"
          variant={strategy === 'greedy' ? 'primary' : 'secondary'}
          fullWidth={false}
          onPress={() => setStrategy('greedy')}
        />
        <MuktButton
          title="Equal parts"
          size="md"
          variant={strategy === 'balanced' ? 'primary' : 'secondary'}
          fullWidth={false}
          onPress={() => setStrategy('balanced')}
        />
      </View>

      {isLoading && <ActivityIndicator color={colors.primary} />}

      {isError && (
        <MuktCard variant="flat" padding="md">
          <Text accessibilityLiveRegion="polite" style={text('label', colors.danger)}>
            {getApiErrorMessage(error)}
          </Text>
        </MuktCard>
      )}

      {plan && !addsUp && (
        <MuktCard variant="flat" padding="md">
          <Text style={text('label', colors.danger)}>
            Something went wrong calculating this split. Please try again.
          </Text>
        </MuktCard>
      )}

      {plan && addsUp && (
        <View style={[styles.list, settling && styles.settling]}>
          <Text style={text('bodyStrong')}>
            {plan.trancheCount === 1
              ? 'One payment, no split needed'
              : `${plan.trancheCount} payments · ${formatPaise(plan.totalPaise)} total`}
          </Text>

          {plan.tranches.map((t) => (
            <SplitCard
              key={t.index}
              marker={String(t.index)}
              label={`Payment ${t.index} of ${plan.trancheCount}`}
              amountPaise={t.amountPaise}
              status="pending"
            />
          ))}

          {plan.warnings.map((warning) => (
            <Text key={warning} style={text('caption', colors.warning)}>
              {warning}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  title: { marginLeft: spacing.xs, letterSpacing: 0.8 },
  toggle: { flexDirection: 'row', gap: spacing.md },
  list: { gap: spacing.md },
  settling: { opacity: 0.45 },
});
