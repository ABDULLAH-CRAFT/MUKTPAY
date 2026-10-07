import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, shadows, spacing, text } from '@/theme/theme';
import { MuktButton } from './MuktButton';
import { MuktCard } from './MuktCard';

/** Full-area spinner for a screen that is loading its first data. */
export function ScreenLoading({ label }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <ActivityIndicator color={colors.primary} />
      {label ? <Text style={text('caption', colors.textSecondary)}>{label}</Text> : null}
    </View>
  );
}

interface EmptyStateProps {
  glyph?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** "Nothing here yet", with an optional next step. */
export function EmptyState({ glyph = '🧾', title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.empty}>
      <View style={[styles.glyph, shadows.inset('sm')]}>
        <Text style={styles.glyphText}>{glyph}</Text>
      </View>
      <Text style={[text('h3'), styles.centered]}>{title}</Text>
      {message ? <Text style={[text('body', colors.textSecondary), styles.centered]}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <MuktButton title={actionLabel} size="md" fullWidth={false} style={styles.action} onPress={onAction} />
      ) : null}
    </View>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}

/** A failed load, with a Try again button. */
export function ErrorState({ title = 'Something went wrong', message, onRetry, retrying = false }: ErrorStateProps) {
  return (
    <MuktCard variant="flat">
      <Text accessibilityLiveRegion="polite" style={text('bodyStrong', colors.danger)}>
        {title}
      </Text>
      <Text style={[text('caption', colors.textSecondary), styles.mt]}>{message}</Text>
      {onRetry ? (
        <View style={styles.mt}>
          <MuktButton title="Try again" variant="secondary" size="md" fullWidth={false} loading={retrying} onPress={onRetry} />
        </View>
      ) : null}
    </MuktCard>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  glyph: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  glyphText: { fontSize: 30, lineHeight: 38 },
  centered: { textAlign: 'center' },
  action: { alignSelf: 'center', marginTop: spacing.sm },
  mt: { marginTop: spacing.sm },
});