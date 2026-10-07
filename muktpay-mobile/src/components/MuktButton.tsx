import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, layout, radius, shadows, spacing, text } from '@/theme/theme';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

interface MuktButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const foreground: Record<Variant, string> = {
  primary: colors.textOnPrimary,
  secondary: colors.primary,
  ghost: colors.primary,
};

function surfaceStyle(variant: Variant, pressed: boolean, inactive: boolean): ViewStyle {
  if (inactive) {
    return { backgroundColor: variant === 'primary' ? colors.textDisabled : 'transparent' };
  }
  switch (variant) {
    case 'primary':
      return pressed
        ? { backgroundColor: colors.primaryPressed, ...shadows.primaryInset }
        : { backgroundColor: colors.primary, ...shadows.primaryRaised };
    case 'secondary':
      return { backgroundColor: colors.surface, ...(pressed ? shadows.inset('sm') : shadows.raised('sm')) };
    case 'ghost':
      return { backgroundColor: pressed ? colors.accentSoft : 'transparent' };
  }
}

export function MuktButton({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  fullWidth = true,
  accessibilityLabel,
  style,
}: MuktButtonProps) {
  const inactive = disabled || loading;
  const color = inactive && variant !== 'primary' ? colors.textDisabled : foreground[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        fullWidth ? styles.full : styles.auto,
        surfaceStyle(variant, pressed, inactive),
        style,
      ]}
    >
            <View style={styles.content}>
        {loading && <ActivityIndicator color={color} style={styles.spinner} />}
        <Text style={[text(size === 'lg' ? 'bodyStrong' : 'label', color), styles.label]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  lg: { minHeight: 56, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  md: { minHeight: layout.minTouchTarget, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  full: { alignSelf: 'stretch' },
  auto: { alignSelf: 'flex-start' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', maxWidth: '100%' },
  label: { flexShrink: 1, textAlign: 'center' },
  spinner: { marginRight: spacing.sm },
});