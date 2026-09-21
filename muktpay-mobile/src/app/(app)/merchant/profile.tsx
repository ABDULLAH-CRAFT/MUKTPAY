import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MuktButton, MuktHeader } from '@/components';
import { MerchantProfileForm } from '@/features/merchant/MerchantProfileForm';
import { useMerchant } from '@/features/merchant/MerchantProvider';
import { colors, layout, spacing } from '@/theme/theme';

/** Edit an existing shop profile. First-run setup lives in MerchantOnboarding, not here. */
export default function MerchantProfileScreen() {
  const router = useRouter();
  const { clearProfile } = useMerchant();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <View style={styles.page}>
        <MuktHeader title="Shop details" onBack={goBack} />

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <MerchantProfileForm submitLabel="Save changes" onSaved={goBack} onCancel={goBack} />

          <MuktButton
            title="Remove saved shop details"
            variant="ghost"
            onPress={async () => {
              await clearProfile();
              goBack(); // home falls back to onboarding on its own
            }}
          />
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
