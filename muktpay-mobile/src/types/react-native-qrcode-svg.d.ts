/**
 * Minimal typings for react-native-qrcode-svg, covering only the props we use.
 *
 * The package's own bundled types have been inconsistent across versions under TypeScript's
 * strict mode. If `npm test` and `tsc` are happy without this file after an upgrade, delete it —
 * an ambient declaration like this one shadows the package's real types, so it should not
 * outlive the need for it.
 */
declare module 'react-native-qrcode-svg' {
  import type { ComponentType } from 'react';

  export interface QRCodeProps {
    /** The string encoded into the code. */
    value: string;
    /** Width and height in points. */
    size?: number;
    /** Module (dark) colour. */
    color?: string;
    backgroundColor?: string;
    /** Error-correction level: L 7%, M 15%, Q 25%, H 30%. */
    ecl?: 'L' | 'M' | 'Q' | 'H';
    /** Blank margin around the code, in points. */
    quietZone?: number;
    enableLinearGradient?: boolean;
    onError?: (error: Error) => void;
  }

  const QRCode: ComponentType<QRCodeProps>;
  export default QRCode;
}
