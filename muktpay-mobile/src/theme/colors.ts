/**
 * MuktPay palette.
 * Neumorphism only works when cards share the SAME colour as the screen background,
 * so `background` and `surface` are intentionally identical.
 */
export const colors = {
  // Surfaces
  background: '#EAF1FC', // very light blue
  surface: '#EAF1FC',
  white: '#FFFFFF',

  // Brand
  primary: '#1F5EFF', // blue
  primaryPressed: '#1748C9',
  accent: '#2F8CFF', // bright blue (focus rings, highlights)
  accentSoft: '#D6E6FF', // tinted backgrounds

  // Text
  textPrimary: '#0B1B3A', // dark navy
  textSecondary: '#5A6B8C',
  textOnPrimary: '#FFFFFF',
  textDisabled: '#9AA9C4',

  // Neumorphic light source (top-left)
  shadowLight: '#FFFFFF',
  shadowDark: '#C3D2EA',

  // Lines
  border: '#D5E0F2',

  // Status
  success: '#0A8F55',
  successSoft: '#D9F4E7',
  warning: '#B36B00',
  warningSoft: '#FFEBC8',
  danger: '#C93030',
  dangerSoft: '#FDE0E0',
  info: '#1F5EFF',
  infoSoft: '#D6E6FF',
} as const;

export type ColorName = keyof typeof colors;
