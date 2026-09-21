import { forwardRef, useState, type ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { colors, layout, radius, shadows, spacing, text } from '@/theme/theme';

interface MuktInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  helper?: string;
  left?: ReactNode;
  right?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export const MuktInput = forwardRef<TextInput, MuktInputProps>(function MuktInput(
  { label, error, helper, left, right, containerStyle, onFocus, onBlur, ...inputProps },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.accent : 'transparent';

  return (
    <View style={containerStyle}>
      <Text style={[text('label', colors.textSecondary), styles.label]}>{label}</Text>

      <View style={[styles.field, shadows.inset('sm'), { borderColor }]}>
        {left ? <View style={styles.adornment}>{left}</View> : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={colors.textDisabled}
          selectionColor={colors.accent}
          style={[styles.input, text('body')]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...inputProps}
        />
        {right ? <View style={styles.adornment}>{right}</View> : null}
      </View>

      {error ? (
        <Text accessibilityLiveRegion="polite" style={[text('caption', colors.danger), styles.message]}>
          {error}
        </Text>
      ) : helper ? (
        <Text style={[text('caption', colors.textSecondary), styles.message]}>{helper}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  label: { marginBottom: spacing.sm, marginLeft: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, minHeight: layout.minTouchTarget, paddingVertical: spacing.sm },
  adornment: { marginHorizontal: spacing.xs },
  message: { marginTop: spacing.xs, marginLeft: spacing.xs },
});
