import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MuktButton, MuktHeader } from '@/components';
import { MerchantProfileForm } from '@/features/merchant/MerchantProfileForm';
import { useMerchant } from '@/features/merchant/MerchantProvider';
import { contentColumn, keyboardBehavior } from '@/theme/responsive';
import { colors, spacing } from '@/theme/theme';

/** Edit an existing shop profile. First-run setup lives in MerchantOnboarding, not here. */
export default function MerchantProfileScreen() {
  const router = useRouter();
  const { clearProfile } = useMerchant();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const confirmRemove = () =>
    Alert.alert(
      'Remove shop details?',
      "You won't be able to create bills until you add a shop name and UPI ID again. Existing bills stay in your history.",
      [
        { text: 'Keep details', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await clearProfile();
            goBack(); // home falls back to onboarding on its own
          },
        },
      ],
    );

  return (
    <KeyboardAvoidingView behavior={keyboardBehavior} style={styles.page}>
      <MuktHeader title="Shop details" onBack={goBack} />

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <MerchantProfileForm submitLabel="Save changes" onSaved={goBack} onCancel={goBack} />

        <MuktButton title="Remove saved shop details" variant="ghost" onPress={confirmRemove} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  body: { ...contentColumn, paddingBottom: spacing.xxxl, gap: spacing.xl },
});