import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { MuktButton, MuktCard, MuktInput } from '@/components';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/apiError';
import { colors, spacing, text } from '@/theme/theme';
import { useAuth } from './AuthProvider';

const validateCode = (value: string) => (/^\d{6}$/.test(value.trim()) ? undefined : 'Enter the 6-digit code');

/** Asks for a code by email, then checks it. Shown on the Account screen until the email is verified. */
export function VerifyEmailCard() {
  const { user, refreshUser } = useAuth();
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [verified, setVerified] = useState(false);

  const send = useMutation({
    mutationFn: async () => {
      await api.post('/auth/send-verification');
    },
    onSuccess: () => setCodeSent(true),
  });

  const verify = useMutation({
    mutationFn: async () => {
      await api.post('/auth/verify-email', { code: code.trim() });
    },
    onSuccess: () => {
      setVerified(true);
      void refreshUser().catch(() => {}); // the badge updates now; the server copy refreshes in the background
    },
  });

  if (verified) {
    return (
      <MuktCard variant="flat" padding="md">
        <Text accessibilityLiveRegion="polite" style={text('bodyStrong', colors.success)}>
          Email verified
        </Text>
      </MuktCard>
    );
  }

  const codeError = submitted ? validateCode(code) : undefined;
  const onVerify = () => {
    setSubmitted(true);
    if (validateCode(code)) return;
    verify.mutate();
  };

  return (
    <MuktCard padding="md">
      <Text style={text('h3')}>Verify your email</Text>
      <Text style={[text('body', colors.textSecondary), styles.mt]}>
        {codeSent
          ? `We emailed a 6-digit code to ${user?.email ?? 'your email'}. It expires in 30 minutes.`
          : 'Confirm that this email address is yours. It keeps your account recoverable if you forget your password.'}
      </Text>

      {send.isError ? (
        <Text accessibilityLiveRegion="polite" style={[text('label', colors.danger), styles.mt]}>
          {getApiErrorMessage(send.error)}
        </Text>
      ) : null}

      {codeSent ? (
        <View style={styles.form}>
          <MuktInput
            label="6-digit code"
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            error={codeError ?? (verify.isError ? getApiErrorMessage(verify.error) : undefined)}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            returnKeyType="go"
            onSubmitEditing={onVerify}
            placeholder="123456"
          />
          <MuktButton title="Verify" onPress={onVerify} loading={verify.isPending} />
          <MuktButton title="Send a new code" variant="ghost" onPress={() => send.mutate()} loading={send.isPending} />
        </View>
      ) : (
        <View style={styles.form}>
          <MuktButton title="Email me a code" onPress={() => send.mutate()} loading={send.isPending} />
        </View>
      )}
    </MuktCard>
  );
}

const styles = StyleSheet.create({
  mt: { marginTop: spacing.sm },
  form: { marginTop: spacing.lg, gap: spacing.md },
});
