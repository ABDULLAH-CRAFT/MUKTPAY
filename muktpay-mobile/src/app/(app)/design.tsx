import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  AmountDisplay,
  MuktButton,
  MuktCard,
  MuktHeader,
  MuktInput,
  SplitCard,
  TransactionCard,
} from '@/components';
import { useHealth } from '@/hooks/useHealth';
import { API_BASE_URL } from '@/lib/api';
import { colors, layout, spacing, text } from '@/theme/theme';
import { formatPaise, parseRupeesToPaise } from '@/utils/money';

// Design-system showcase. Handy reference while building; removed before launch.
export default function DesignShowcase() {
  const router = useRouter();
  const health = useHealth();
  const [amount, setAmount] = useState('6800');
  const paise = parseRupeesToPaise(amount);

  return (
    <View style={styles.page}>
      <MuktHeader title="Design system" subtitle="MuktPay components" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Section title="Backend">
          <MuktCard>
            <View style={styles.between}>
              <Text style={text('caption', colors.textSecondary)}>API</Text>
              {health.isLoading && <ActivityIndicator color={colors.primary} />}
              {health.isError && <Text style={text('label', colors.danger)}>Unreachable</Text>}
              {health.data && (
                <Text style={text('label', health.data.status === 'ok' ? colors.success : colors.danger)}>
                  {health.data.status === 'ok' ? 'Connected' : 'Degraded'} · DB {health.data.database}
                </Text>
              )}
            </View>
            <Text style={[text('micro', colors.textSecondary), styles.mt]}>{API_BASE_URL}</Text>
          </MuktCard>
        </Section>

        <Section title="Amounts (integer paise → Indian grouping)">
          <MuktCard>
            <AmountDisplay amountPaise={680000} size="xl" tone="primary" />
            <View style={[styles.between, styles.mt]}>
              <AmountDisplay amountPaise={199900} size="lg" />
              <AmountDisplay amountPaise={199950} size="md" tone="success" />
              <AmountDisplay amountPaise={123456700} size="sm" tone="muted" />
            </View>
          </MuktCard>
        </Section>

        <Section title="Buttons">
          <View style={styles.gap}>
            <MuktButton title="Start Payment" onPress={() => {}} />
            <MuktButton title="Scan QR" variant="secondary" onPress={() => {}} />
            <MuktButton title="Cancel" variant="ghost" onPress={() => {}} />
            <MuktButton title="Processing" loading onPress={() => {}} />
            <MuktButton title="Disabled" disabled onPress={() => {}} />
          </View>
        </Section>

        <Section title="Input">
          <MuktInput
            label="Bill amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            left={<Text style={text('bodyStrong', colors.textSecondary)}>₹</Text>}
            error={amount.length > 0 && paise === null ? 'Enter a valid amount, e.g. 1999 or 1999.50' : undefined}
            helper={paise !== null ? `Reads as ${formatPaise(paise, { alwaysShowDecimals: true })}` : undefined}
          />
        </Section>

        <Section title="Split cards (Phase 7 checkout preview)">
          <View style={styles.gap}>
            <SplitCard marker="1" label="Payment 1 of 4" amountPaise={199900} status="paid" />
            <SplitCard marker="2" label="Payment 2 of 4" amountPaise={199900} status="processing" highlighted />
            <SplitCard marker="3" label="Payment 3 of 4" amountPaise={199900} status="pending" />
            <SplitCard marker="4" label="Payment 4 of 4" amountPaise={80300} status="failed" sublabel="Tap to retry" onPress={() => {}} />
          </View>
        </Section>

        <Section title="Transactions">
          <View style={styles.gap}>
            <TransactionCard
              merchantName="ABC Store"
              subtitle="shop@ybl · 20 Sep, 4:30 pm"
              totalPaise={680000}
              detail="4 payments"
              status="paid"
              onPress={() => {}}
            />
            <TransactionCard
              merchantName="Chai Point"
              subtitle="chai@okaxis · 19 Sep, 9:10 am"
              totalPaise={45000}
              status="pending"
              onPress={() => {}}
            />
          </View>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[text('label', colors.textSecondary), styles.sectionTitle]}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  // Extra horizontal room so outer shadows aren't cut off at the screen edge.
  content: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.xxxl },
  section: { marginBottom: spacing.xxl },
  sectionTitle: { marginBottom: spacing.md, marginLeft: spacing.xs, letterSpacing: 0.8 },
  gap: { gap: spacing.lg },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mt: { marginTop: spacing.md },
});
