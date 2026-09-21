import type { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, shadows, spacing } from '@/theme/theme';
import type { SpacingKey } from '@/theme/spacing';
import type { ShadowLevel } from '@/theme/shadows';

interface MuktCardProps {
  children: ReactNode;
  /** raised = pops out (default) · inset = sunk in · flat = no shadow */
  variant?: 'raised' | 'inset' | 'flat';
  elevation?: ShadowLevel;
  padding?: SpacingKey;
  /** Makes the whole card tappable; it visually "presses in" while held. */
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function MuktCard({
  children,
  variant = 'raised',
  elevation = 'md',
  padding = 'lg',
  onPress,
  accessibilityLabel,
  style,
}: MuktCardProps) {
  const base: ViewStyle = { padding: spacing[padding] };
  const shadowFor = (pressed: boolean): ViewStyle =>
    variant === 'flat' ? {} : variant === 'inset' || pressed ? shadows.inset(elevation) : shadows.raised(elevation);

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.card, base, shadowFor(pressed), style]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View accessibilityLabel={accessibilityLabel} style={[styles.card, base, shadowFor(false), style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // NOTE: no overflow:'hidden' here, it would clip the outer shadows.
  card: { backgroundColor: colors.surface, borderRadius: radius.lg },
});
