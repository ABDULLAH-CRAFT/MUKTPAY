import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, text } from '@/theme/theme';
import { MuktCard } from './MuktCard';

interface AccountCardProps {
  /** e.g. "Switch to paying" */
  switchLabel: string;
  onSwitch: () => void;
  onLogout: () => void | Promise<void>;
}

/** Switch side + log out, as full-width rows with proper touch targets. Shared by both home screens. */
export function AccountCard({ switchLabel, onSwitch, onLogout }: AccountCardProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  const logOut = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <MuktCard variant="flat" padding="sm">
      <Row label={switchLabel} onPress={onSwitch} />
      <View style={styles.divider} />
      <Row
        label={loggingOut ? 'Logging out…' : 'Log out'}
        tone={colors.danger}
        disabled={loggingOut}
        onPress={() => void logOut()}
      />
    </MuktCard>
  );
}

function Row({
  label,
  onPress,
  tone = colors.textPrimary,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tone?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={text('bodyStrong', tone)}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.sm },
  pressed: { opacity: 0.6 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});