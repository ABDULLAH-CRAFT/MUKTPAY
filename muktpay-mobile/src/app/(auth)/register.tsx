import { useRef, useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { MuktButton, MuktCard, MuktInput } from '@/components';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { useAuth } from '@/features/auth/AuthProvider';
import { validateEmail, validateName, validatePassword } from '@/features/auth/validation';
import { getApiErrorMessage } from '@/lib/apiError';
import { colors, text } from '@/theme/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({ mutationFn: () => register(name.trim(), email.trim(), password) });

  const nameError = submitted ? validateName(name) : undefined;
  const emailError = submitted ? validateEmail(email) : undefined;
  const passwordError = submitted ? validatePassword(password) : undefined;

  const onSubmit = () => {
    setSubmitted(true);
    if (validateName(name) || validateEmail(email) || validatePassword(password)) return;
    mutation.mutate();
  };

  return (
    <AuthLayout title="Create your account" subtitle="It takes less than a minute.">
      {mutation.isError && (
        <MuktCard variant="flat" padding="md" accessibilityLabel="Error">
          <Text accessibilityLiveRegion="polite" style={text('label', colors.danger)}>
            {getApiErrorMessage(mutation.error)}
          </Text>
        </MuktCard>
      )}

      <MuktInput
        label="Full name"
        value={name}
        onChangeText={setName}
        error={nameError}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        placeholder="Abdullah Khan"
      />

      <MuktInput
        ref={emailRef}
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
        helper="At least 8 characters, with a letter and a number"
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
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

      <MuktButton title="Create account" onPress={onSubmit} loading={mutation.isPending} style={{ marginTop: 8 }} />
      <MuktButton title="I already have an account" variant="ghost" onPress={() => router.back()} />
    </AuthLayout>
  );
}
