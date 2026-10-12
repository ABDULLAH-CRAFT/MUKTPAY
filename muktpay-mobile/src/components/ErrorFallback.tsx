import { StyleSheet, Text, View } from 'react-native';
import { colors, layout, spacing, text } from '@/theme/theme';
import { MuktButton } from './MuktButton';
import { MuktCard } from './MuktCard';

interface ErrorFallbackProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  retryLabel?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function ErrorFallback({
  title = 'Something went wrong',
  message,
  onRetry,
  retrying = false,
  retryLabel = 'Try again',
  secondaryLabel,
  onSecondary,
}: ErrorFallbackProps) {
  return (
    <View style={styles.page}>
      <View style={styles.column}>
        <MuktCard variant="flat">
          <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={text('h3', colors.danger)}>
            {title}
          </Text>
          <Text style={[text('body', colors.textSecondary), styles.mt]}>{message}</Text>
        </MuktCard>

        {onRetry ? <MuktButton title={retryLabel} loading={retrying} onPress={onRetry} /> : null}
        {onSecondary && secondaryLabel ? (
          <MuktButton title={secondaryLabel} variant="ghost" onPress={onSecondary} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', backgroundColor: colors.background },
  column: {
    width: '100%',
    maxWidth: layout.maxContentWidth + layout.screenPadding * 2,
    alignSelf: 'center',
    paddingHorizontal: layout.screenPadding,
    gap: spacing.lg,
  },
  mt: { marginTop: spacing.sm },
});