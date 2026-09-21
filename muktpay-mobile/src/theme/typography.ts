import type { TextStyle } from 'react-native';
import { colors } from './colors';

/**
 * System fonts for now (SF Pro on iOS, Roboto on Android): zero loading, native feel.
 * To switch to e.g. Inter later, load it with expo-font and add `fontFamily` here only.
 */
export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  display: 44,
} as const;

export const typography = {
  display: { fontSize: fontSize.display, lineHeight: 52, fontWeight: '800', letterSpacing: -1 },
  h1: { fontSize: fontSize.xxl, lineHeight: 38, fontWeight: '800', letterSpacing: -0.5 },
  h2: { fontSize: fontSize.xl, lineHeight: 30, fontWeight: '700', letterSpacing: -0.3 },
  h3: { fontSize: fontSize.lg, lineHeight: 26, fontWeight: '700' },
  body: { fontSize: fontSize.md, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: fontSize.md, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: fontSize.sm, lineHeight: 20, fontWeight: '400' },
  label: { fontSize: fontSize.sm, lineHeight: 18, fontWeight: '600' },
  micro: { fontSize: fontSize.xs, lineHeight: 16, fontWeight: '600', letterSpacing: 0.3 },
} as const satisfies Record<string, TextStyle>;

/** Every text style gets the navy colour unless a component overrides it. */
export const text = (variant: keyof typeof typography, color: string = colors.textPrimary): TextStyle => ({
  ...typography[variant],
  color,
});

export type TypographyVariant = keyof typeof typography;
