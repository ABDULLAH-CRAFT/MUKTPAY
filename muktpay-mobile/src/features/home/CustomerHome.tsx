import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AccountCard, MuktButton, MuktCard, MuktHeader } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useRole } from '@/features/role/RoleProvider';
import { contentColumn } from '@/theme/responsive';
import { colors, spacing, text } from '@/theme/theme';

/** The pay-a-shop side: one obvious action, then the account rows. */
export function CustomerHome() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { resetRole } = useRole();

  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <View style={styles.page}>
      <MuktHeader title={`Hi, ${firstName}`} subtitle={user?.email} />

      <ScrollView contentContainerStyle={styles.content}>
        <MuktCard>
          <Text style={text('h3')}>Pay any shop with UPI</Text>
          <Text style={[text('body', colors.textSecondary), styles.mt]}>
            Scan the shop&apos;s UPI QR code, then finish the payment in your own UPI app. MuktPay never holds or
            processes your money.
          </Text>
          <View style={styles.actions}>
            <MuktButton title="Scan & Pay" onPress={() => router.push('/scan')} />
            <MuktButton
              title="Enter UPI ID instead"
              variant="secondary"
              onPress={() => router.push('/manual-entry')}
            />
          </View>
        </MuktCard>

        {__DEV__ ? (
          <MuktButton title="Design system preview (dev only)" variant="ghost" onPress={() => router.push('/design')} />
        ) : null}

        <AccountCard switchLabel="Switch to collecting" onSwitch={() => void resetRole()} onLogout={logout} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { ...contentColumn, paddingBottom: spacing.xxxl, gap: spacing.xl },
  mt: { marginTop: spacing.sm },
  actions: { marginTop: spacing.xl, gap: spacing.md },
});