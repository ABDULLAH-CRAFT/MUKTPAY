import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AmountDisplay, MuktButton, MuktCard, MuktHeader, StatusBadge } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useRole } from '@/features/role/RoleProvider';
import { colors, layout, radius, spacing, text } from '@/theme/theme';
import { todayRange } from '@/utils/dateRange';
import { MerchantOnboarding } from './MerchantOnboarding';
import { useMerchant } from './MerchantProvider';
import { useBillsSummary, useLatestOpenBill } from './useBills';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** A thin filled bar out of `fraction` (0 to 1), clamped. Used for both hero cards below. */
function ProgressBar({ fraction, tone = colors.primary }: { fraction: number; tone?: string }) {
  const pct = Math.max(0, Math.min(1, fraction));
  return (
    <View style={styles.trackOuter}>
      <View style={[styles.trackFill, { width: `${pct * 100}%`, backgroundColor: tone }]} />
    </View>
  );
}

/** The collect-a-payment side: onboarding until a profile exists, then the dashboard. */
export function MerchantHome() {
  const router = useRouter();
  const { logout } = useAuth();
  const { resetRole } = useRole();
  const { status, profile } = useMerchant();
  const { data: openBill } = useLatestOpenBill();
  const { data: today } = useBillsSummary(todayRange());
  const [loggingOut, setLoggingOut] = useState(false);

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!profile) return <MerchantOnboarding />;

  const collectedToday = today?.collectedPaise ?? 0;
  const invoicedToday = today?.invoicedPaise ?? 0;
  const openBillPaidCount = openBill?.chunks.filter((c) => c.status === 'paid').length ?? 0;
  const openBillTotal = openBill?.chunks.length ?? 0;

  return (
    <View style={styles.page}>
      <MuktHeader title={greeting()} subtitle={profile.shopName} />

      <ScrollView contentContainerStyle={styles.content}>
        <MuktCard onPress={() => router.push('/merchant/history')} accessibilityLabel="See today's bill history">
          <Text style={text('label', colors.textSecondary)}>TODAY&apos;S COLLECTIONS</Text>
          <AmountDisplay amountPaise={collectedToday} size="xl" tone="success" />
          {invoicedToday > 0 ? (
            <View style={styles.heroProgress}>
              <ProgressBar fraction={collectedToday / invoicedToday} tone={colors.success} />
              <Text style={[text('caption', colors.textSecondary), styles.mtXs]}>
                of {formatRupeesRounded(invoicedToday)} billed
              </Text>
            </View>
          ) : (
            <Text style={[text('caption', colors.textSecondary), styles.mt]}>No bills yet today.</Text>
          )}
          {today && today.billsCreated > 0 ? (
            <Text style={[text('caption', colors.textSecondary), styles.mtXs]}>
              {today.billsCreated} bill{today.billsCreated === 1 ? '' : 's'} today · {today.settledCount} settled
            </Text>
          ) : null}
        </MuktCard>

        {openBill ? (
          <MuktCard
            onPress={() => router.push({ pathname: '/merchant/bill', params: { ref: openBill.ref } })}
            accessibilityLabel="Resume the bill in progress"
          >
            <View style={styles.cardHead}>
              <Text style={text('label', colors.textSecondary)}>BILL IN PROGRESS</Text>
              <StatusBadge status="processing" />
            </View>
            {openBill.note ? (
              <Text style={[text('bodyStrong'), styles.mt]} numberOfLines={1}>
                {openBill.note}
              </Text>
            ) : null}
            <View style={[styles.progressRow, styles.mt]}>
              <AmountDisplay amountPaise={openBill.totalPaise} size="md" tone="primary" />
              <Text style={text('caption', colors.textSecondary)}>
                {openBillPaidCount} of {openBillTotal} paid
              </Text>
            </View>
            <View style={styles.mtSm}>
              <ProgressBar fraction={openBillTotal ? openBillPaidCount / openBillTotal : 0} />
            </View>
            <Text style={[text('caption', colors.textSecondary), styles.mtXs]}>Ref {openBill.ref}</Text>
          </MuktCard>
        ) : null}

        <View style={styles.actionRow}>
          <MuktButton
            title="New bill"
            fullWidth={false}
            style={styles.actionButton}
            onPress={() => router.push('/merchant/new-bill')}
          />
          <MuktButton
            title="History"
            variant="secondary"
            fullWidth={false}
            style={styles.actionButton}
            onPress={() => router.push('/merchant/history')}
          />
        </View>

        <MuktCard padding="md">
          <View style={styles.cardHead}>
            <Text style={text('label', colors.textSecondary)}>PAYMENTS GO TO</Text>
            {profile.verification === 'format' ? (
              <View style={styles.pill}>
                <Text style={text('micro', colors.warning)}>NOT VERIFIED</Text>
              </View>
            ) : null}
          </View>
          <Text style={[text('h3'), styles.mt]}>{profile.vpa}</Text>
          <View style={styles.editRow}>
            <Text style={text('caption', colors.textSecondary)}>{profile.issuerLabel ?? 'Handle not recognised'}</Text>
            <Text
              accessibilityRole="button"
              onPress={() => router.push('/merchant/profile')}
              style={text('label', colors.primary)}
            >
              Edit
            </Text>
          </View>
        </MuktCard>

        <MuktCard padding="md" variant="flat" style={styles.accountCard}>
          <AccountRow label="Switch to paying" onPress={() => void resetRole()} />
          <View style={styles.divider} />
          <AccountRow label="Log out" tone={colors.danger} loading={loggingOut} onPress={async () => {
            setLoggingOut(true);
            await logout();
          }} />
        </MuktCard>
      </ScrollView>
    </View>
  );
}

function AccountRow({
  label,
  onPress,
  tone = colors.textPrimary,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  tone?: string;
  loading?: boolean;
}) {
  return (
    <Text accessibilityRole="button" onPress={loading ? undefined : onPress} style={styles.accountRow}>
      <Text style={text('bodyStrong', tone)}>{loading ? 'Logging out…' : label}</Text>
    </Text>
  );
}

// Local, tiny helper: a whole-rupee string for the "of ₹X billed" line — no paise precision needed.
function formatRupeesRounded(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  content: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.xxxl, gap: spacing.lg },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  mt: { marginTop: spacing.sm },
  mtSm: { marginTop: spacing.sm },
  mtXs: { marginTop: spacing.xs },
  heroProgress: { marginTop: spacing.md },
  progressRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  trackOuter: { height: 8, borderRadius: radius.pill, backgroundColor: colors.accentSoft, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: radius.pill },
  actionRow: { flexDirection: 'row', gap: spacing.md },
  actionButton: { flex: 1 },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.warningSoft,
  },
  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  accountCard: { gap: 0 },
  accountRow: { paddingVertical: spacing.md },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});