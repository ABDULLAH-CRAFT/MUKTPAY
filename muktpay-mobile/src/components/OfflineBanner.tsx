import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetwork } from '@/features/network/NetworkProvider';
import { colors, layout, radius, spacing, text } from '@/theme/theme';

/** A small pill shown while the phone has no internet. */
export function OfflineBanner() {
  const { isOnline } = useNetwork();
  const insets = useSafeAreaInsets();

  if (isOnline) return null;

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + spacing.md }]}>
      <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.pill}>
        <Text style={[text('label', colors.warning), styles.label]}>No internet connection. Some things may not load.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    zIndex: 1000,
    elevation: 10,
    pointerEvents: 'none',
  },
  pill: {
    maxWidth: layout.maxContentWidth,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  label: { textAlign: 'center' },
});