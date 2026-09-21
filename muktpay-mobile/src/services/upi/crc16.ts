/**
 * CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF): the checksum BharatQR / EMV QR codes end with.
 * Lets us reject a QR that was misread by the camera or tampered with.
 * Check value: crc16ccitt('123456789') === 0x29B1.
 */
export function crc16ccitt(input: string): number {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= (input.charCodeAt(i) & 0xff) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}
