export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const layout = {
  screenPadding: 20,
  /** Minimum comfortable tap target (Apple HIG 44pt / Material 48dp). */
  minTouchTarget: 44,
} as const;

export type SpacingKey = keyof typeof spacing;
