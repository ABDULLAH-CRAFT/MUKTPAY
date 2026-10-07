import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AccountCard,
  AmountDisplay,
  ErrorState,
  MuktButton,
  MuktCard,
  MuktHeader,
  ScreenLoading,
  StatusBadge,
} from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useRole } from '@/features/role/RoleProvider';
import { contentColumn } from '@/theme/responsive';
import { colors, radius, spacing, text } from '@/theme/theme';
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

/** A thin filled bar out of `fraction` (0 to 1), clamped. */
function ProgressBar({ fraction, tone = colors.primary }: { fraction: number; tone?: string }) {
  const pct = Math.max(0, Math.min(1, fraction));
  return (
    <View style={styles.trackOuter}>
      <View style={[styles.trackFill, { width: `${pct * 100}%`, backgroundColor: tone }]} />
    </View>
  );
}

// A whole-rupee string for the "of ₹X billed" line, since no paise precision is needed there.
function formatRupeesRounded(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/** The collect-a-payment side: onboarding until a profile exists, then the dashboard. */
export function MerchantHome() {
  const router = useRouter();
  const { logout } = useAuth();
  const { resetRole } = useRole();
  const { status, profile } = useMerchant();
  const { data: openBill, refetch: refetchOpenBill } = useLatestOpenBill();
  const {
    data: today,
    isError: todayFailed,
    isFetching: todayFetching,
    refetch: refetchToday,
  } = useBillsSummary(todayRange());
  const [refreshing, setRefreshing] = useState(false);

  if (status === 'loading') {
    return (
      <View style={styles.page}>
        <ScreenLoading />
      </View>
    );
  }

  if (!profile) return <MerchantOnboarding />;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([refetchToday(), refetchOpenBill()]);
    setRefreshing(false);
  };

  const collectedToday = today?.collectedPaise ?? 0;
  const invoicedToday = today?.invoicedPaise ?? 0;
  const openBillPaidCount = openBill?.chunks.filter((c) => c.status === 'paid').length ?? 0;
  const openBillTotal = openBill?.chunks.length ?? 0;

  return (
    <View style={styles.page}>
      <MuktHeader title={greeting()} subtitle={profile.shopName} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* 1 · Work in progress comes first */}
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
                {openBillPaidCount} of {openBillTotal} marked paid
              </Text>
            </View>
            <View style={styles.mt}>
              <ProgressBar fraction={openBillTotal ? openBillPaidCount / openBillTotal : 0} />
            </View>
            <Text style={[text('caption', colors.textSecondary), styles.mtXs]}>Ref {openBill.ref}</Text>
          </MuktCard>
        ) : null}

        {/* 2 · Primary actions */}
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

        {/* 3 · Today */}
        {todayFailed && !today ? (
          <ErrorState
            title="Couldn't load today's totals"
            message="Check your connection and try again. You can still create bills."
            onRetry={() => void refetchToday()}
            retrying={todayFetching}
          />
        ) : (
          <MuktCard onPress={() => router.push('/merchant/history')} accessibilityLabel="See today's bill history">
            <Text style={text('label', colors.textSecondary)}>MARKED AS PAID TODAY</Text>
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
                {today.billsCreated} bill{today.billsCreated === 1 ? '' : 's'} today · {today.settledCount} fully marked
                paid
              </Text>
            ) : null}
          </MuktCard>
        )}

        {/* 4 · Where the money goes */}
        <MuktCard padding="md">
          <View style={styles.cardHead}>
            <Text style={text('label', colors.textSecondary)}>PAYMENTS GO TO</Text>
            {profile.verification === 'format' ? (
              <View style={styles.pill}>
                <Text style={text('micro', colors.warning)}>NOT VERIFIED</Text>
              </View>
            ) : null}
          </View>
          <Text selectable style={[text('h3'), styles.mt]}>
            {profile.vpa}
          </Text>
          <View style={styles.editRow}>
            <Text style={[text('caption', colors.textSecondary), styles.flex]} numberOfLines={1}>
              {profile.issuerLabel ?? 'Handle not recognised'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit shop details"
              hitSlop={12}
              onPress={() => router.push('/merchant/profile')}
              style={styles.editButton}
            >
              <Text style={text('label', colors.primary)}>Edit</Text>
            </Pressable>
          </View>
        </MuktCard>

        <AccountCard switchLabel="Switch to paying" onSwitch={() => void resetRole()} onLogout={logout} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { ...contentColumn, paddingBottom: spacing.xxxl, gap: spacing.lg },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  mt: { marginTop: spacing.sm },
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
  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, gap: spacing.md },
  editButton: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
});