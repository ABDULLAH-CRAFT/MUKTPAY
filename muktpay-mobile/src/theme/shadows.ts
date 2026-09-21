import type { ViewStyle } from 'react-native';
import { colors } from './colors';

/**
 * Neumorphism = two shadows per element: a dark one bottom-right, a light one top-left.
 * React Native's `boxShadow` supports several shadows and `inset` on iOS and Android
 * (New Architecture), so no third-party library is needed.
 *
 * raised  → element looks pushed OUT of the surface (cards, buttons)
 * inset   → element looks pressed INTO the surface (inputs, pressed buttons)
 */
export type ShadowLevel = 'sm' | 'md' | 'lg';

const distance: Record<ShadowLevel, number> = { sm: 4, md: 8, lg: 14 };
const blur: Record<ShadowLevel, number> = { sm: 8, md: 16, lg: 26 };

export const raised = (level: ShadowLevel = 'md'): ViewStyle => ({
  boxShadow: [
    { offsetX: distance[level], offsetY: distance[level], blurRadius: blur[level], color: colors.shadowDark },
    { offsetX: -distance[level], offsetY: -distance[level], blurRadius: blur[level], color: colors.shadowLight },
  ],
});

export const inset = (level: ShadowLevel = 'md'): ViewStyle => ({
  boxShadow: [
    { offsetX: distance[level] / 2, offsetY: distance[level] / 2, blurRadius: blur[level] / 1.5, color: colors.shadowDark, inset: true },
    { offsetX: -distance[level] / 2, offsetY: -distance[level] / 2, blurRadius: blur[level] / 1.5, color: colors.shadowLight, inset: true },
  ],
});

/** Blue glow under filled primary buttons. */
export const primaryRaised: ViewStyle = {
  boxShadow: [
    { offsetX: 6, offsetY: 8, blurRadius: 16, color: 'rgba(31, 94, 255, 0.38)' },
    { offsetX: -5, offsetY: -5, blurRadius: 12, color: colors.shadowLight },
  ],
};

/** Pressed state for filled primary buttons. */
export const primaryInset: ViewStyle = {
  boxShadow: [{ offsetX: 3, offsetY: 4, blurRadius: 8, color: 'rgba(0, 0, 0, 0.32)', inset: true }],
};

export const shadows = { raised, inset, primaryRaised, primaryInset } as const;
