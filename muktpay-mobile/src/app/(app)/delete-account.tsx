import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { MuktButton, MuktCard, MuktHeader, MuktInput } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { getApiErrorMessage } from '@/lib/apiError';
import { contentColumn, keyboardBehavior } from '@/theme/responsive';
import { colors, spacing, text } from '@/theme/theme';

/** Asks for the password again, then deletes the account for good. */
export default function DeleteAccountScreen() {
  const router = useRouter();
  const { deleteAccount } = useAuth();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // On success the session ends and the router sends the person to the login screen by itself.
  const mutation = useMutation({ mutationFn: () => deleteAccount(password) });

  const passwordError = submitted && !password ? 'Enter your password to confirm' : undefined;

  const onDelete = () => {
    setSubmitted(true);
    if (!password) return;
    Alert.alert(
      'Delete your account?',
      "This permanently deletes your account, shop details and bills. You can't undo it.",
      [
        { text: 'Keep my account', style: 'cancel' },
        { text: 'Delete permanently', style: 'destructive', onPress: () => mutation.mutate() },
      ],
    );
  };

  return (
    <KeyboardAvoidingView behavior={keyboardBehavior} style={styles.page}>
      <MuktHeader title="Delete account" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <MuktCard padding="md">
          <Text style={text('h3')}>What gets deleted</Text>
          <Text style={[text('body', colors.textSecondary), styles.mt]}>
            Your account (name and email), your shop details, every bill and payment record you created in MuktPay, and
            all your logins on every device.
          </Text>
          <Text style={[text('body', colors.textSecondary), styles.mt]}>
            Payments you already made in a UPI app are not affected. MuktPay never held that money, so we can&apos;t
            reverse or refund anything.
          </Text>
        </MuktCard>

        {mutation.isError && (
          <MuktCard variant="flat" padding="md" accessibilityLabel="Error">
            <Text accessibilityLiveRegion="polite" style={text('label', colors.danger)}>
              {getApiErrorMessage(mutation.error)}
            </Text>
          </MuktCard>
        )}

        <View style={styles.form}>
          <MuktInput
            label="Your password"
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={onDelete}
            right={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                hitSlop={12}
                onPress={() => setShowPassword((v) => !v)}
              >
                <Text style={text('label', colors.primary)}>{showPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            }
          />
          <MuktButton title="Delete my account permanently" onPress={onDelete} loading={mutation.isPending} />
          <MuktButton title="Cancel" variant="ghost" onPress={() => router.back()} disabled={mutation.isPending} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { ...contentColumn, paddingBottom: spacing.xxxl, gap: spacing.lg },
  mt: { marginTop: spacing.md },
  form: { gap: spacing.lg },
});
