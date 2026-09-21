import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, shadows, spacing, text } from '@/theme/theme';

interface MuktHeaderProps {
  title: string;
  subtitle?: string;
  /** Shows a back button when provided. Wire it to router.back() in the screen. */
  onBack?: () => void;
  /** Anything on the right: an avatar, a settings button... */
  right?: ReactNode;
}

export function MuktHeader({ title, subtitle, onBack, right }: MuktHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.md }]}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          hitSlop={8}
          style={({ pressed }) => [styles.back, pressed ? shadows.inset('sm') : shadows.raised('sm')]}
        >
          <Text style={text('h2', colors.primary)}>‹</Text>
        </Pressable>
      ) : null}

      <View style={styles.titles}>
        <Text accessibilityRole="header" style={text('h1')} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={text('caption', colors.textSecondary)}>{subtitle}</Text> : null}
      </View>

      {right ? <View>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
  },
  back: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: layout.minTouchTarget / 2,
    marginRight: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  titles: { flex: 1 },
});
