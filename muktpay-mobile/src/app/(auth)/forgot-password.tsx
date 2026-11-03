import { useRef, useState } from 'react';
import { Alert, Pressable, Text, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { MuktButton, MuktCard, MuktInput } from '@/components';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { validateEmail, validatePassword } from '@/features/auth/validation';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/apiError';
import { colors, text } from '@/theme/theme';

type Step = 'email' | 'reset';

const validateCode = (value: string) => (/^\d{6}$/.test(value.trim()) ? undefined : 'Enter the 6-digit code');

/** Two steps on one screen: ask for a code by email, then enter the code and a new password. */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const sendCode = useMutation({
    mutationFn: async () => {
      await api.post('/auth/forgot-password', { email: email.trim() });
    },
    onSuccess: () => {
      setStep('reset');
      setSubmitted(false);
      setNotice(`If an account exists for ${email.trim()}, we've emailed a 6-digit code. It expires in 15 minutes.`);
    },
  });

  const reset = useMutation({
    mutationFn: async () => {
      await api.post('/auth/reset-password', { email: email.trim(), code: code.trim(), newPassword: password });
    },
    onSuccess: () => {
      Alert.alert('Password updated', 'Log in with your new password.', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
    },
  });

  const emailError = submitted ? validateEmail(email) : undefined;
  const codeError = submitted ? validateCode(code) : undefined;
  const passwordError = submitted ? validatePassword(password) : undefined;
  const confirmError = submitted && !passwordError && confirm !== password ? "Passwords don't match" : undefined;

  const onSendCode = () => {
    setSubmitted(true);
    if (validateEmail(email)) return;
    sendCode.mutate();
  };

  const onReset = () => {
    setSubmitted(true);
    if (validateCode(code) || validatePassword(password) || confirm !== password) return;
    reset.mutate();
  };

  const onResend = () => {
    sendCode.mutate(undefined, { onSuccess: () => setNotice('If that email has an account, a new code is on its way.') });
  };

  const activeError = step === 'email' ? sendCode : reset;

  return (
    <AuthLayout
      title="Reset your password"
      subtitle={step === 'email' ? "Enter your email and we'll send you a code." : 'Enter the code and choose a new password.'}
    >
      {activeError.isError && (
        <MuktCard variant="flat" padding="md" accessibilityLabel="Error">
          <Text accessibilityLiveRegion="polite" style={text('label', colors.danger)}>
            {getApiErrorMessage(activeError.error)}
          </Text>
        </MuktCard>
      )}

      {step === 'reset' && notice ? (
        <MuktCard variant="flat" padding="md">
          <Text accessibilityLiveRegion="polite" style={text('label', colors.textSecondary)}>
            {notice}
          </Text>
        </MuktCard>
      ) : null}

      {step === 'email' ? (
        <>
          <MuktInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="go"
            onSubmitEditing={onSendCode}
            placeholder="you@example.com"
          />
          <MuktButton title="Send code" onPress={onSendCode} loading={sendCode.isPending} />
        </>
      ) : (
        <>
          <MuktInput
            label="6-digit code"
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            error={codeError}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            placeholder="123456"
          />

          <MuktInput
            ref={passwordRef}
            label="New password"
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            helper="At least 8 characters, with a letter and a number"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
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

          <MuktInput
            ref={confirmRef}
            label="Confirm new password"
            value={confirm}
            onChangeText={setConfirm}
            error={confirmError}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={onReset}
          />

          <MuktButton title="Change password" onPress={onReset} loading={reset.isPending} />
          <MuktButton title="Send a new code" variant="ghost" onPress={onResend} loading={sendCode.isPending} />
          <MuktButton title="Use a different email" variant="ghost" onPress={() => setStep('email')} />
        </>
      )}

      <MuktButton title="Back to log in" variant="ghost" onPress={() => router.replace('/login')} />
    </AuthLayout>
  );
}
