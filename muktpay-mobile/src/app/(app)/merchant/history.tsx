import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AmountDisplay,
  Chip,
  EmptyState,
  ErrorState,
  MuktCard,
  MuktHeader,
  MuktInput,
  ScreenLoading,
  StatusBadge,
} from '@/components';
import { useBillsInfinite, type BillsFilter } from '@/features/merchant/useBills';
import { getApiErrorMessage } from '@/lib/apiError';
import { contentColumn } from '@/theme/responsive';
import { colors, spacing, text } from '@/theme/theme';
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
  const filtered = Boolean(search) || dateFilter !== 'all';

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setDateFilter('all');
  };

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
        <View style={styles.chips} accessibilityRole="radiogroup">
          {DATE_FILTERS.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              selected={item.key === dateFilter}
              onPress={() => setDateFilter(item.key)}
            />
          ))}
        </View>
      </View>

      {isLoading ? (
        <ScreenLoading label="Loading bills…" />
      ) : isError && bills.length === 0 ? (
        <View style={styles.column}>
          <ErrorState
            title="Couldn't load your bills"
            message={getApiErrorMessage(error)}
            onRetry={() => void refetch()}
            retrying={isRefetching}
          />
        </View>
      ) : (
        <FlatList<Bill>
          contentContainerStyle={[styles.body, bills.length === 0 && styles.grow]}
          data={bills}
          keyExtractor={(bill) => bill.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage && !isError) void fetchNextPage();
          }}
          refreshing={isRefetching && !isFetchingNextPage}
          onRefresh={() => void refetch()}
          ListEmptyComponent={
            filtered ? (
              <EmptyState
                glyph="🔍"
                title="No bills match"
                message="Try a different search or date range."
                actionLabel="Clear filters"
                onAction={clearFilters}
              />
            ) : (
              <EmptyState
                title="No bills yet"
                message="Bills you create will show up here."
                actionLabel="Create a bill"
                onAction={() => router.push('/merchant/new-bill')}
              />
            )
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={colors.primary} style={styles.footer} />
            ) : isError && bills.length > 0 ? (
              <ErrorState
                title="Couldn't load more"
                message={getApiErrorMessage(error)}
                onRetry={() => void fetchNextPage()}
              />
            ) : null
          }
          renderItem={({ item: bill }) => {
            const paidCount = bill.chunks.filter((c) => c.status === 'paid').length;
            return (
              <MuktCard
                onPress={() => router.push({ pathname: '/merchant/bill', params: { ref: bill.ref } })}
                accessibilityLabel={`Bill ${bill.ref}, ${formatPaise(bill.totalPaise)}`}
              >
                <View style={styles.row}>
                  <Text style={text('label', colors.textSecondary)}>{bill.ref}</Text>
                  <StatusBadge
                    status={bill.status === 'settled' ? 'paid' : bill.status === 'open' ? 'processing' : bill.status}
                  />
                </View>
                {bill.note ? (
                  <Text style={[text('bodyStrong'), styles.mt]} numberOfLines={1}>
                    {bill.note}
                  </Text>
                ) : null}
                <View style={[styles.row, styles.mt]}>
                  <AmountDisplay amountPaise={bill.totalPaise} size="md" tone="primary" />
                  <Text style={text('caption', colors.textSecondary)}>
                    {paidCount} of {bill.chunks.length} marked paid
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
  column: { ...contentColumn },
  filters: { ...contentColumn, paddingBottom: spacing.md, gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  body: { ...contentColumn, paddingBottom: spacing.xxxl, gap: spacing.md },
  grow: { flexGrow: 1, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  mt: { marginTop: spacing.xs },
  footer: { paddingVertical: spacing.lg },
});