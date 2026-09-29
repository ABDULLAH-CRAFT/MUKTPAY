import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MuktButton, MuktCard, MuktInput } from '@/components';
import { getApiErrorMessage } from '@/lib/apiError';
import { colors, spacing, text } from '@/theme/theme';
import { useMerchant } from './MerchantProvider';
import { checkVpa, normalizeShopName, SHOP_NAME_MAX, validateShopName } from './validateMerchantProfile';

interface MerchantProfileFormProps {
  submitLabel: string;
  onSaved: () => void;
  onCancel?: () => void;
}

/** Shared by first-run onboarding and the edit screen — one definition of the form, two entry points. */
export function MerchantProfileForm({ submitLabel, onSaved, onCancel }: MerchantProfileFormProps) {
  const { profile, saveProfile } = useMerchant();

  const [shopName, setShopName] = useState(profile?.shopName ?? '');
  const [vpa, setVpa] = useState(profile?.vpa ?? '');
  const [touched, setTouched] = useState<{ shopName: boolean; vpa: boolean }>({ shopName: false, vpa: false });
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const nameError = validateShopName(shopName);
  const vpaCheck = useMemo(() => checkVpa(vpa), [vpa]);
  const ready = !nameError && vpaCheck.ok;

  const submit = async () => {
    setTouched({ shopName: true, vpa: true });
    if (!ready || saving) return;

    setSaving(true);
    setSubmitError(null);
    try {
      await saveProfile({
        shopName: normalizeShopName(shopName),
        vpa: vpaCheck.vpa,
        issuerLabel: vpaCheck.issuerLabel,
      });
      onSaved();
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.form}>
      <MuktInput
        label="Shop name"
        value={shopName}
        onChangeText={setShopName}
        onBlur={() => setTouched((t) => ({ ...t, shopName: true }))}
        error={touched.shopName ? nameError : undefined}
        helper="Customers see this in their UPI app when they scan"
        placeholder="Gupta Kirana Store"
        maxLength={SHOP_NAME_MAX}
        autoCapitalize="words"
        returnKeyType="next"
      />

      <MuktInput
        label="Your UPI ID"
        value={vpa}
        onChangeText={(v) => {
          setVpa(v);
          setTouched((t) => ({ ...t, vpa: false })); // stop shouting while they're still typing
        }}
        onBlur={() => setTouched((t) => ({ ...t, vpa: true }))}
        error={touched.vpa && !vpaCheck.ok ? vpaCheck.message : undefined}
        helper={!vpaCheck.ok ? 'e.g. guptakirana@okhdfcbank' : undefined}
        placeholder="shop@ybl"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
      />

      {vpaCheck.ok ? (
        <MuktCard padding="md" elevation="sm">
          <Text style={text('bodyStrong')}>{vpaCheck.vpa}</Text>
          <Text style={[text('caption', colors.textSecondary), styles.mt]}>
            {vpaCheck.issuerLabel
              ? `Looks like ${vpaCheck.issuerLabel}.`
              : "We don't recognise this handle — that's fine, new ones appear often."}
          </Text>
        </MuktCard>
      ) : null}

      <MuktCard padding="md" elevation="sm" variant="inset">
        <Text style={text('label', colors.warning)}>NOT VERIFIED</Text>
        <Text style={[text('caption', colors.textSecondary), styles.mt]}>
          We only check that this is shaped like a UPI ID. We can&apos;t confirm the account exists or
          that it&apos;s yours. Send yourself ₹1 from another app before taking a real payment — a typo
          here sends your customers&apos; money to a stranger.
        </Text>
      </MuktCard>

      {submitError ? (
        <MuktCard variant="flat" padding="md">
          <Text accessibilityLiveRegion="polite" style={text('bodyStrong', colors.danger)}>
            {submitError}
          </Text>
        </MuktCard>
      ) : null}

      <MuktButton title={submitLabel} loading={saving} disabled={!ready} onPress={() => void submit()} />
      {onCancel ? <MuktButton title="Cancel" variant="ghost" onPress={onCancel} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.xl },
  mt: { marginTop: spacing.xs },
});
