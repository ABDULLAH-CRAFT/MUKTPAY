import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MuktButton, MuktCard, MuktHeader } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, layout, spacing, text } from '@/theme/theme';

// Temporary home. Phase 10 replaces it with the real dashboard.
export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <View style={styles.page}>
      <MuktHeader title={`Hi, ${firstName}`} subtitle={user?.email} />

      <ScrollView contentContainerStyle={styles.content}>
        <MuktCard>
          <Text style={text('h3')}>You're signed in ✓</Text>
          <Text style={[text('body', colors.textSecondary), styles.mt]}>
            Your session is stored securely on this device and renews itself automatically.
          </Text>
        </MuktCard>

        <MuktButton title="Scan & Pay" onPress={() => router.push('/scan')} />
        <MuktButton title="Design system preview" variant="secondary" onPress={() => router.push('/design')} />
        <MuktButton
          title="Log out"
          variant="ghost"
          loading={loggingOut}
          onPress={async () => {
            setLoggingOut(true);
            await logout();
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.xxxl, gap: spacing.xl },
  mt: { marginTop: spacing.sm },
});
