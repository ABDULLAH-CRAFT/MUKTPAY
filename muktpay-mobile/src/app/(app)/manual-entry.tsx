import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MuktButton, MuktHeader, MuktInput } from '@/components';
import { normalizeUpiInput, readUpiInput } from '@/services/upi';
import { colors, layout, spacing, text } from '@/theme/theme';

// Sample codes so the flow can be tried without a real QR (development builds only).
const SAMPLES = [
  { label: 'Kirana ₹3,850', value: 'upi://pay?pa=guptakirana@okhdfcbank&pn=Gupta%20Kirana%20Store&am=3850' },
  { label: 'Bistro ₹6,800', value: 'upi://pay?pa=socialbistro@paytm&pn=Social%20Bistro&am=6800' },
  { label: 'No amount', value: 'shop@ybl' },
];

export default function ManualEntryScreen() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const result = readUpiInput(value);
  const error = submitted && !result.ok ? result.error.message : undefined;

  const submit = () => {
    setSubmitted(true);
    if (!result.ok) return;
    router.replace({ pathname: '/scan-result', params: { payload: normalizeUpiInput(value) } });
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.flex}>
      <View style={styles.page}>
        <MuktHeader title="Enter UPI ID" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <MuktInput
            label="UPI ID or payment link"
            value={value}
            onChangeText={(v) => {
              setValue(v);
              setSubmitted(false);
            }}
            error={error}
            helper="e.g. shop@ybl, or a upi://pay?… link"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="go"
            onSubmitEditing={submit}
            placeholder="shop@ybl"
          />
          <MuktButton title="Continue" onPress={submit} disabled={!value.trim()} />

          {__DEV__ && (
            <View style={styles.samples}>
              <Text style={text('label', colors.textSecondary)}>TRY A SAMPLE (DEV ONLY)</Text>
              <View style={styles.chips}>
                {SAMPLES.map((s) => (
                  <MuktButton
                    key={s.label}
                    title={s.label}
                    variant="secondary"
                    size="md"
                    fullWidth={false}
                    onPress={() => {
                      setValue(s.value);
                      setSubmitted(false);
                    }}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  page: { flex: 1 },
  body: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.xxxl, gap: spacing.xl },
  samples: { gap: spacing.md, marginTop: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
});
