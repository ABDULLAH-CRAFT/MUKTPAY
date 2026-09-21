import { colors } from './colors';
import { fontSize, text, typography } from './typography';
import { layout, radius, spacing } from './spacing';
import { shadows } from './shadows';

export const theme = { colors, typography, fontSize, text, spacing, radius, layout, shadows } as const;
export type Theme = typeof theme;

export { colors, typography, fontSize, text, spacing, radius, layout, shadows };
