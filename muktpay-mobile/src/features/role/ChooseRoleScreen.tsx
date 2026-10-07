import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MuktCard, MuktHeader } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { contentColumn } from '@/theme/responsive';
import { colors, radius, shadows, spacing, text } from '@/theme/theme';
import { useRole, type AppRole } from './RoleProvider';

interface Choice {
  role: AppRole;
  glyph: string;
  title: string;
  subtitle: string;
  bullets: string[];
}

const CHOICES: Choice[] = [
  {
    role: 'customer',
    glyph: '📱',
    title: "I'm paying",
    subtitle: 'Scan a QR code and pay a shop',
    bullets: [
      'Scan any UPI QR',
      'Split a big bill into smaller payments',
      'Pay from any UPI app on your phone',
    ],
  },
  {
    role: 'merchant',
    glyph: '🏪',
    title: "I'm collecting",
    subtitle: 'Take payment from a customer',
    bullets: [
      'Show QR codes customers scan',
      'Split a large bill past per-app caps',
      'Keep your own record of each payment you mark',
    ],
  },
];

/** First screen after sign-in, until the person picks a side. They can switch later from either home screen. */
export function ChooseRoleScreen() {
  const { user } = useAuth();
  const { chooseRole } = useRole();
  const [busy, setBusy] = useState<AppRole | null>(null);

  const firstName = user?.name.split(' ')[0] ?? 'there';

  const pick = (role: AppRole) => {
    setBusy(role);
    void chooseRole(role);
  };

  return (
    <View style={styles.page}>
      <MuktHeader title={`Hi, ${firstName}`} subtitle="How are you using MuktPay right now?" />

      <ScrollView contentContainerStyle={styles.body}>
        {CHOICES.map((choice) => (
          <MuktCard
            key={choice.role}
            onPress={() => pick(choice.role)}
            accessibilityLabel={`${choice.title}. ${choice.subtitle}`}
            style={busy === choice.role ? styles.selected : undefined}
          >
            <View style={styles.head}>
              <View style={[styles.glyph, shadows.inset('sm')]}>
                <Text style={styles.glyphText}>{choice.glyph}</Text>
              </View>
              <View style={styles.headText}>
                <Text style={text('h2')}>{choice.title}</Text>
                <Text style={text('caption', colors.textSecondary)}>{choice.subtitle}</Text>
              </View>
            </View>

            <View style={styles.bullets}>
              {choice.bullets.map((line) => (
                <View key={line} style={styles.bulletRow}>
                  <Text style={text('caption', colors.primary)}>•</Text>
                  <Text style={[text('caption', colors.textSecondary), styles.bulletText]}>
                    {line}
                  </Text>
                </View>
              ))}
            </View>
          </MuktCard>
        ))}

        <Text style={[text('caption', colors.textSecondary), styles.footnote]}>
          You can switch between the two at any time from the home screen.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  body: { ...contentColumn, paddingBottom: spacing.xxxl, gap: spacing.xl },
  selected: { borderWidth: 1.5, borderColor: colors.accent },
  head: { flexDirection: 'row', alignItems: 'center' },
  glyph: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginRight: spacing.lg,
  },
  glyphText: { fontSize: 26, lineHeight: 32 },
  headText: { flex: 1 },
  bullets: { marginTop: spacing.lg, gap: spacing.xs },
  bulletRow: { flexDirection: 'row', gap: spacing.sm },
  bulletText: { flex: 1 },
  footnote: { textAlign: 'center' },
});