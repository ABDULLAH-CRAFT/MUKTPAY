import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MuktCard } from '@/components';
import { colors, spacing, text } from '@/theme/theme';
import { formatPaise } from '@/utils/money';
import { useBillEvents, type BillEvent } from './useBillEvents';

const COLLAPSED_COUNT = 4;

function describe(event: BillEvent): string {
  const amount = event.amountPaise !== null ? ` · ${formatPaise(event.amountPaise)}` : '';
  switch (event.type) {
    case 'bill_created':
      return `Bill created${amount}`;
    case 'chunk_marked_paid':
      return `Payment ${event.chunkIndex} marked paid${amount}`;
    case 'chunk_marked_pending':
      return `Payment ${event.chunkIndex} marked unpaid${amount}`;
    case 'bill_settled':
      return 'All payments marked as paid';
    case 'bill_reopened':
      return 'Bill reopened';
    case 'bill_cancelled':
      return 'Bill cancelled';
    case 'bill_expired':
      return 'Bill expired (no payment marked in time)';
  }
}

/** A read-only timeline of everything that happened to a bill, newest first. */
export function BillActivity({ billRef }: { billRef: string }) {
  const { data: events, isLoading, isError } = useBillEvents(billRef);
  const [expanded, setExpanded] = useState(false);

  if (isLoading || isError || !events || events.length === 0) return null;

  const visible = expanded ? events : events.slice(0, COLLAPSED_COUNT);
  const hiddenCount = events.length - visible.length;

  return (
    <View style={styles.wrap}>
      <Text style={text('label', colors.textSecondary)}>ACTIVITY</Text>
      <MuktCard padding="md">
        {visible.map((event, i) => (
          <View key={event.id} style={[styles.row, i > 0 && styles.rowBorder]}>
            <Text style={text('bodyStrong')}>{describe(event)}</Text>
            <Text style={text('caption', colors.textSecondary)}>
              {new Date(event.createdAt).toLocaleString()}
              {event.actorId === null ? ' · automatic' : ''}
            </Text>
          </View>
        ))}

        {events.length > COLLAPSED_COUNT ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Show fewer events' : `Show all ${events.length} events`}
            onPress={() => setExpanded((v) => !v)}
            style={styles.toggle}
          >
            <Text style={text('label', colors.primary)}>
              {expanded ? 'Show fewer' : `Show ${hiddenCount} more`}
            </Text>
          </Pressable>
        ) : null}
      </MuktCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  row: { paddingVertical: spacing.sm, gap: spacing.xs },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  toggle: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});