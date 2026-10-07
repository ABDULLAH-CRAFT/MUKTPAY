import { KeyboardAvoidingView, ScrollView, StyleSheet, Text } from 'react-native';
import { MuktButton, MuktHeader } from '@/components';
import { useRole } from '@/features/role/RoleProvider';
import { contentColumn, keyboardBehavior } from '@/theme/responsive';
import { colors, spacing, text } from '@/theme/theme';
import { MerchantProfileForm } from './MerchantProfileForm';

/** Shown instead of the dashboard until the merchant has a shop name and UPI ID saved. */
export function MerchantOnboarding() {
  const { resetRole } = useRole();

  return (
    <KeyboardAvoidingView behavior={keyboardBehavior} style={styles.page}>
      <MuktHeader title="Set up your shop" subtitle="Two details, then you can take payments" />

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={text('body', colors.textSecondary)}>
          Every QR code you show a customer is built from these two fields. You can change them later.
        </Text>

        <MerchantProfileForm submitLabel="Save and continue" onSaved={() => {}} />

        <MuktButton title="Switch to paying instead" variant="ghost" onPress={() => void resetRole()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  body: { ...contentColumn, paddingBottom: spacing.xxxl, gap: spacing.xl },
});