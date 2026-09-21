import { StyleSheet, View } from 'react-native';
import { colors, radius } from '@/theme/theme';

const FRAME = 264;
const CORNER = 40;
const DIM = 'rgba(6, 16, 38, 0.62)';

/** Dims everything except a square "window" with blue corner marks. Purely visual. */
export function ScanFrame() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.dim, { flex: 1 }]} />
      <View style={styles.middle}>
        <View style={[styles.dim, { flex: 1 }]} />
        <View style={styles.frame}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
        </View>
        <View style={[styles.dim, { flex: 1 }]} />
      </View>
      <View style={[styles.dim, { flex: 1.25 }]} />
    </View>
  );
}

const edge = { borderColor: colors.accent, width: CORNER, height: CORNER, position: 'absolute' } as const;

const styles = StyleSheet.create({
  dim: { backgroundColor: DIM },
  middle: { flexDirection: 'row', height: FRAME },
  frame: { width: FRAME, height: FRAME },
  corner: edge,
  tl: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: radius.md },
  tr: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: radius.md },
  bl: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: radius.md },
  br: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: radius.md },
});
