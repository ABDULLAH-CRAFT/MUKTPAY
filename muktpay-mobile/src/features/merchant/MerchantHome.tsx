import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AmountDisplay, MuktButton, MuktCard, MuktHeader, StatusBadge } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useRole } from '@/features/role/RoleProvider';
import { colors, layout, radius, shadows, spacing, text } from '@/theme/theme';
import { useActiveBill } from './ActiveBillProvider';
import { MerchantOnboarding } from './MerchantOnboarding';
import { useMerchant } from './MerchantProvider';

const ROADMAP: { phase: string; title: string; done: boolean }[] = [
  { phase: '1', title: 'Choose merchant or customer mode', done: true },
  { phase: '2', title: 'Save your shop name and UPI ID', done: true },
  { phase: '3', title: 'Enter a bill and preview the split', done: true },
  { phase: '4', title: 'Show one QR code per payment', done: true },
  { phase: '5', title: 'Track and re-open past bills', done: false },
];

/** The collect-a-payment side: onboarding until a profile exists, then the dashboard. */
export function MerchantHome() {
  const router = useRouter();
  const { logout } = useAuth();
  const { resetRole } = useRole();
  const { status, profile } = useMerchant();
  const { bill } = useActiveBill();
  const [loggingOut, setLoggingOut] = useState(false);

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!profile) return <MerchantOnboarding />;

  return (
    <View style={styles.page}>
      <MuktHeader title="Collect" subtitle={profile.shopName} />

      <ScrollView contentContainerStyle={styles.content}>
        <MuktCard>
          <View style={styles.cardHead}>
            <Text style={text('label', colors.textSecondary)}>PAYMENTS GO TO</Text>
            <StatusBadge status="pending" />
          </View>
          <Text style={[text('h3'), styles.mt]}>{profile.vpa}</Text>
          <Text style={[text('caption', colors.textSecondary), styles.mt]}>
            {profile.issuerLabel ?? 'Handle not recognised'} · format-checked only, not verified
          </Text>
          <MuktButton
            title="Edit shop details"
            variant="secondary"
            size="md"
            fullWidth={false}
            style={styles.editButton}
            onPress={() => router.push('/merchant/profile')}
          />
        </MuktCard>

        {bill ? (
          <MuktCard onPress={() => router.push('/merchant/bill')} accessibilityLabel="Resume the bill in progress">
            <View style={styles.cardHead}>
              <Text style={text('label', colors.textSecondary)}>BILL IN PROGRESS</Text>
              <StatusBadge status="processing" />
            </View>
            <View style={[styles.progressRow, styles.mt]}>
              <AmountDisplay amountPaise={bill.totalPaise} size="md" tone="primary" />
              <Text style={text('caption', colors.textSecondary)}>
                Ref {bill.ref} · {bill.chunks.filter((c) => c.status === 'paid').length} of {bill.chunks.length} paid
              </Text>
            </View>
          </MuktCard>
        ) : null}

        <MuktButton title="New bill" onPress={() => router.push('/merchant/new-bill')} />

        <MuktCard padding="md">
          <Text style={[text('label', colors.textSecondary), styles.roadmapTitle]}>BUILD PROGRESS</Text>
          {ROADMAP.map((item) => (
            <View key={item.phase} style={styles.roadmapRow}>
              <View style={[styles.marker, item.done ? styles.markerDone : shadows.inset('sm')]}>
                <Text style={text('label', item.done ? colors.white : colors.primary)}>
                  {item.done ? '✓' : item.phase}
                </Text>
              </View>
              <Text
                style={[
                  text(item.done ? 'bodyStrong' : 'body', item.done ? colors.textPrimary : colors.textSecondary),
                  styles.roadmapText,
                ]}
              >
                {item.title}
              </Text>
            </View>
          ))}
        </MuktCard>

        <MuktButton title="Switch to paying" variant="ghost" onPress={() => void resetRole()} />
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  content: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.xxxl, gap: spacing.xl },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  mt: { marginTop: spacing.sm },
  editButton: { marginTop: spacing.lg },
  progressRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  roadmapTitle: { marginBottom: spacing.md },
  roadmapRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  marker: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginRight: spacing.md,
  },
  markerDone: { backgroundColor: colors.success },
  roadmapText: { flex: 1 },
});
