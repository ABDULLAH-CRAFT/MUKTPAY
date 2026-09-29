import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AmountDisplay, MuktButton, MuktCard, MuktHeader, MuktInput, StatusBadge } from '@/components';
import { useBillsInfinite, type BillsFilter } from '@/features/merchant/useBills';
import { getApiErrorMessage } from '@/lib/apiError';
import { colors, layout, spacing, text } from '@/theme/theme';
import { last7DaysRange, todayRange } from '@/utils/dateRange';
import type { Bill } from '@/types/bill';
import { formatPaise } from '@/utils/money';

type DateFilter = 'all' | 'today' | 'week';

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Last 7 days' },
];

/**
 * Every bill matching the current search text and date range, newest first, loaded a page at a
 * time as you scroll. Search matches on ref ("MP7X2K9A") or the note ("Ramesh, order 12").
 */
export default function BillHistoryScreen() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  // Debounce: wait for a pause in typing before hitting the server, so every keystroke doesn't
  // fire a request.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filter: BillsFilter = useMemo(() => {
    const range = dateFilter === 'today' ? todayRange() : dateFilter === 'week' ? last7DaysRange() : null;
    return { search: search || undefined, ...(range ?? {}) };
  }, [search, dateFilter]);

  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage, isRefetching, refetch } =
    useBillsInfinite(filter);

  const bills = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={styles.page}>
      <MuktHeader title="Bill history" onBack={goBack} />

      <View style={styles.filters}>
        <MuktInput
          label="Search"
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search by ref or note"
          returnKeyType="search"
          autoCapitalize="none"
        />
        <View style={styles.chips}>
          {DATE_FILTERS.map((item) => (
            <MuktButton
              key={item.key}
              title={item.label}
              variant={item.key === dateFilter ? 'primary' : 'secondary'}
              size="md"
              fullWidth={false}
              onPress={() => setDateFilter(item.key)}
            />
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.body}>
          <MuktCard variant="flat">
            <Text style={text('bodyStrong', colors.danger)}>{getApiErrorMessage(error)}</Text>
          </MuktCard>
        </View>
      ) : (
        <FlatList<Bill>
          contentContainerStyle={styles.body}
          data={bills}
          keyExtractor={(bill) => bill.id}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
          }}
          refreshing={isRefetching && !isFetchingNextPage}
          onRefresh={() => void refetch()}
          ListEmptyComponent={
            <Text style={[text('body', colors.textSecondary), styles.empty]}>
              {search || dateFilter !== 'all' ? 'No bills match.' : 'No bills yet.'}
            </Text>
          }
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={styles.footer} /> : null}
          renderItem={({ item: bill }) => {
            const paidCount = bill.chunks.filter((c) => c.status === 'paid').length;
            return (
              <MuktCard
                onPress={() => router.push({ pathname: '/merchant/bill', params: { ref: bill.ref } })}
                accessibilityLabel={`Bill ${bill.ref}, ${formatPaise(bill.totalPaise)}`}
              >
                <View style={styles.row}>
                  <Text style={text('label', colors.textSecondary)}>{bill.ref}</Text>
                  <StatusBadge status={bill.status === 'settled' ? 'paid' : bill.status === 'open' ? 'processing' : bill.status} />
                </View>
                {bill.note ? (
                  <Text style={[text('bodyStrong'), styles.mt]} numberOfLines={1}>
                    {bill.note}
                  </Text>
                ) : null}
                <View style={[styles.row, styles.mt]}>
                  <AmountDisplay amountPaise={bill.totalPaise} size="md" tone="primary" />
                  <Text style={text('caption', colors.textSecondary)}>
                    {paidCount} of {bill.chunks.length} paid
                  </Text>
                </View>
                <Text style={[text('caption', colors.textSecondary), styles.mt]}>
                  {new Date(bill.createdAt).toLocaleString()}
                </Text>
              </MuktCard>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filters: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.md, gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  body: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.xxxl, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mt: { marginTop: spacing.xs },
  empty: { textAlign: 'center', marginTop: spacing.xl },
  footer: { paddingVertical: spacing.lg },
});