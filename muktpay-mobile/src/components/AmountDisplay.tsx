import { StyleSheet, Text, TextStyle } from 'react-native';
import { colors, fontSize, typography } from '@/theme/theme';
import { splitPaise } from '@/utils/money';

type Size = 'sm' | 'md' | 'lg' | 'xl';
type Tone = 'default' | 'primary' | 'success' | 'danger' | 'muted';

interface AmountDisplayProps {
  /** Integer paise: ₹1,999 → 199900. See utils/money.ts for why. */
  amountPaise: number;
  size?: Size;
  tone?: Tone;
  /** Force ".00" on whole-rupee amounts. */
  alwaysShowDecimals?: boolean;
  strikethrough?: boolean;
}

const SIZE: Record<Size, TextStyle> = {
  sm: { fontSize: fontSize.md, fontWeight: '600', lineHeight: 22 },
  md: { fontSize: fontSize.lg, fontWeight: '700', lineHeight: 26 },
  lg: { fontSize: fontSize.xxl, fontWeight: '800', lineHeight: 38 },
  xl: typography.display,
};

const TONE: Record<Tone, string> = {
  default: colors.textPrimary,
  primary: colors.primary,
  success: colors.success,
  danger: colors.danger,
  muted: colors.textSecondary,
};

export function AmountDisplay({
  amountPaise,
  size = 'md',
  tone = 'default',
  alwaysShowDecimals = false,
  strikethrough = false,
}: AmountDisplayProps) {
  const { negative, whole, fraction } = splitPaise(amountPaise);
  const decimals = fraction ?? (alwaysShowDecimals ? '00' : null);
  const base = SIZE[size];
  const small = { fontSize: Math.round((base.fontSize ?? 16) * 0.6) };

  return (
    <Text
      accessibilityLabel={`${negative ? 'minus ' : ''}${whole}${decimals ? ` rupees ${Number(decimals)} paise` : ' rupees'}`}
      style={[
        base,
        styles.numbers,
        { color: TONE[tone] },
        strikethrough && { textDecorationLine: 'line-through' },
      ]}
    >
      {negative ? '-' : ''}
      <Text style={[small, { fontWeight: '600' }]}>₹</Text>
      {whole}
      {decimals ? <Text style={small}>.{decimals}</Text> : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  // Digits all the same width so lists of amounts line up.
  numbers: { fontVariant: ['tabular-nums'] },
});
