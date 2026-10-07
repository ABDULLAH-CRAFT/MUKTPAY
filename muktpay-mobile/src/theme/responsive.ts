import { Platform, type ViewStyle } from 'react-native';
import { layout } from './spacing';

/**
 * contentContainerStyle for scrolling screens: full width on phones, a centred column
 * (layout.maxContentWidth) on tablets and desktop, with the usual side padding.
 */
export const contentColumn: ViewStyle = {
  width: '100%',
  maxWidth: layout.maxContentWidth + layout.screenPadding * 2,
  alignSelf: 'center',
  paddingHorizontal: layout.screenPadding,
};

/** One place to change how forms avoid the keyboard. */
export const keyboardBehavior: 'padding' | 'height' = Platform.OS === 'ios' ? 'padding' : 'height';