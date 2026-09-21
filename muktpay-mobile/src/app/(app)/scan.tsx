import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useIsFocused, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MuktButton, MuktCard, MuktHeader } from '@/components';
import { ScanFrame } from '@/features/scan/ScanFrame';
import { readUpiPayment } from '@/services/upi';
import { colors, layout, radius, spacing, text } from '@/theme/theme';

const ERROR_COOLDOWN_MS = 2500;

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();

  const [torch, setTorch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The camera reports the same QR many times per second; only the first read may act.
  const locked = useRef(false);
  const cooldown = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fresh start every time this screen comes into view (e.g. back from the result screen).
  useEffect(() => {
    if (isFocused) {
      locked.current = false;
      setError(null);
    } else {
      setTorch(false);
    }
  }, [isFocused]);

  useEffect(() => () => void (cooldown.current && clearTimeout(cooldown.current)), []);

  const onScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (locked.current) return;
      locked.current = true;

      const result = readUpiPayment(data);
      if (result.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        // Only the raw text travels; the next screen re-validates it (never trust route params).
        router.push({ pathname: '/scan-result', params: { payload: data } });
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(result.error.message);
      cooldown.current = setTimeout(() => {
        locked.current = false;
        setError(null);
      }, ERROR_COOLDOWN_MS);
    },
    [router],
  );

  // --- Permission states --------------------------------------------------------------------
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.page}>
        <MuktHeader title="Scan QR" onBack={() => router.back()} />
        <View style={styles.permissionBody}>
          <MuktCard>
            <Text style={text('h3')}>Camera access needed</Text>
            <Text style={[text('body', colors.textSecondary), styles.mt]}>
              MuktPay uses the camera only to read UPI QR codes. Nothing is recorded or uploaded.
            </Text>
          </MuktCard>

          {permission.canAskAgain ? (
            <MuktButton title="Allow camera access" onPress={requestPermission} />
          ) : (
            <MuktButton title="Open settings" onPress={() => Linking.openSettings()} />
          )}
          <MuktButton title="Enter UPI ID instead" variant="secondary" onPress={() => router.push('/manual-entry')} />
        </View>
      </View>
    );
  }

  // --- Scanner ------------------------------------------------------------------------------
  return (
    <View style={styles.camera}>
      {isFocused && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={onScanned}
        />
      )}
      <ScanFrame />

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.md }]}>
        <Pill label="Close" accessibilityLabel="Close scanner" onPress={() => router.back()} />
        <Pill
          label={torch ? 'Flash on' : 'Flash off'}
          accessibilityLabel="Toggle flashlight"
          onPress={() => setTorch((on) => !on)}
        />
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Text
          accessibilityLiveRegion="polite"
          style={[text('bodyStrong', error ? '#FFB4B4' : colors.white), styles.hint]}
        >
          {error ?? 'Point the camera at a UPI QR code'}
        </Text>
        <MuktButton
          title="Enter UPI ID manually"
          variant="secondary"
          size="md"
          fullWidth={false}
          onPress={() => router.push('/manual-entry')}
        />
      </View>
    </View>
  );
}

function Pill({ label, accessibilityLabel, onPress }: { label: string; accessibilityLabel: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.pill, pressed && { opacity: 0.7 }]}
    >
      <Text style={text('label', colors.white)}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  permissionBody: { paddingHorizontal: layout.screenPadding, gap: spacing.xl },
  mt: { marginTop: spacing.sm },
  camera: { flex: 1, backgroundColor: '#000' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
  },
  pill: {
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: layout.screenPadding,
  },
  hint: { textAlign: 'center' },
});
