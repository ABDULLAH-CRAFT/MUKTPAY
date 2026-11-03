import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MuktButton, MuktCard, MuktHeader } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { VerifyEmailCard } from '@/features/auth/VerifyEmailCard';
import { contentColumn } from '@/theme/responsive';
import { colors, spacing, text } from '@/theme/theme';

/** Who you are signed in as, email verification, and permanent account deletion. */
export default function AccountScreen() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <View style={styles.page}>
      <MuktHeader title="Account" subtitle="Your details and security" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <MuktCard padding="md">
          <Text style={text('label', colors.textSecondary)}>Name</Text>
          <Text style={text('bodyStrong')}>{user?.name}</Text>

          <Text style={[text('label', colors.textSecondary), styles.mt]}>Email</Text>
          <Text style={text('bodyStrong')}>{user?.email}</Text>
          <Text style={[text('caption', user?.emailVerified ? colors.success : colors.textSecondary), styles.status]}>
            {user?.emailVerified ? 'Verified' : 'Not verified yet'}
          </Text>
        </MuktCard>

        {user && !user.emailVerified ? <VerifyEmailCard /> : null}

        <MuktCard padding="md">
          <Text style={text('h3', colors.danger)}>Delete account</Text>
          <Text style={[text('body', colors.textSecondary), styles.mt]}>
            Permanently removes your account, your shop details and every bill you created in MuktPay. This can&apos;t
            be undone.
          </Text>
          <View style={styles.action}>
            <MuktButton title="Delete my account" variant="secondary" onPress={() => router.push('/delete-account')} />
          </View>
        </MuktCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { ...contentColumn, paddingBottom: spacing.xxxl, gap: spacing.lg },
  mt: { marginTop: spacing.md },
  status: { marginTop: spacing.xs },
  action: { marginTop: spacing.lg },
});
