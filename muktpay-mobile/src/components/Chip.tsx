import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, layout, radius, shadows, spacing, text } from '@/theme/theme';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** A selectable option (filters, presets). Same look as the old primary/secondary buttons, with correct a11y state. */
export function Chip({ label, selected, onPress, disabled = false, accessibilityLabel, style }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected
          ? [styles.selected, pressed ? shadows.primaryInset : shadows.primaryRaised]
          : pressed
            ? shadows.inset('sm')
            : shadows.raised('sm'),
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={text('label', selected ? colors.textOnPrimary : colors.primary)} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.primary },
  disabled: { opacity: 0.5 },
});