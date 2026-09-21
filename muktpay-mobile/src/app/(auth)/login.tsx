import { useRef, useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { MuktButton, MuktCard, MuktInput } from '@/components';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { useAuth } from '@/features/auth/AuthProvider';
import { validateEmail } from '@/features/auth/validation';
import { getApiErrorMessage } from '@/lib/apiError';
import { colors, text } from '@/theme/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({ mutationFn: () => login(email.trim(), password) });

  const emailError = submitted ? validateEmail(email) : undefined;
  const passwordError = submitted && !password ? 'Enter your password' : undefined;

  const onSubmit = () => {
    setSubmitted(true);
    if (validateEmail(email) || !password) return;
    mutation.mutate(); // on success AuthProvider flips to "authenticated" and the router moves on
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to keep splitting payments.">
      {mutation.isError && (
        <MuktCard variant="flat" padding="md" accessibilityLabel="Error">
          <Text accessibilityLiveRegion="polite" style={text('label', colors.danger)}>
            {getApiErrorMessage(mutation.error)}
          </Text>
        </MuktCard>
      )}

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
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        placeholder="you@example.com"
      />

      <MuktInput
        ref={passwordRef}
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={passwordError}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
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

      <MuktButton title="Log in" onPress={onSubmit} loading={mutation.isPending} style={{ marginTop: 8 }} />
      <MuktButton title="Create an account" variant="ghost" onPress={() => router.push('/register')} />
    </AuthLayout>
  );
}
