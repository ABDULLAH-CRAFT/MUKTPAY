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
      <View style={styles.inner}>
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
          {/* Shrinks instead of overflowing on 320dp phones or with a long amount. */}
          <Text
            accessibilityRole="header"
            style={text('h1')}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={text('caption', colors.textSecondary)} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
  },
  // Same centred column as the screen bodies (see theme/responsive.ts), so tablets line up.
  inner: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
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
  right: { marginLeft: spacing.md },
});