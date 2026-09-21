import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MuktButton, MuktHeader } from '@/components';
import { useRole } from '@/features/role/RoleProvider';
import { colors, layout, spacing, text } from '@/theme/theme';
import { MerchantProfileForm } from './MerchantProfileForm';

/** Shown instead of the dashboard until the merchant has a shop name and UPI ID saved. */
export function MerchantOnboarding() {
  const { resetRole } = useRole();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <View style={styles.page}>
        <MuktHeader title="Set up your shop" subtitle="Two details, then you can take payments" />

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={text('body', colors.textSecondary)}>
            Every QR code you show a customer is built from these two fields. You can change them later.
          </Text>

          <MerchantProfileForm submitLabel="Save and continue" onSaved={() => {}} />

          <MuktButton title="Switch to paying instead" variant="ghost" onPress={() => void resetRole()} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  page: { flex: 1 },
  body: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.xxxl, gap: spacing.xl },
});
