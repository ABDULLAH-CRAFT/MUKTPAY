import { describe, expect, it } from 'vitest';
import { crc16ccitt } from './crc16';
import { readUpiPayment } from './index';

const tlv = (tag: string, value: string) => `${tag}${String(value.length).padStart(2, '0')}${value}`;

/** Builds a structurally valid BharatQR/EMV string with a correct CRC. */
function buildQr(opts: { vpa?: string; name?: string; amount?: string; currency?: string; nested?: boolean } = {}) {
  const { vpa = 'shop@ybl', name = 'ABC Store', amount, currency = '356', nested = true } = opts;
  const account = nested ? tlv('26', tlv('00', 'A000000524') + tlv('01', vpa)) : tlv('26', vpa);
  const body =
    tlv('00', '01') +
    tlv('01', amount ? '12' : '11') +
    account +
    tlv('52', '5411') +
    tlv('53', currency) +
    (amount ? tlv('54', amount) : '') +
    tlv('58', 'IN') +
    tlv('59', name) +
    tlv('60', 'Delhi') +
    '6304';
  return body + crc16ccitt(body).toString(16).toUpperCase().padStart(4, '0');
}

describe('BharatQR', () => {
  it('extracts payee, name, amount and category from a valid code', () => {
    const result = readUpiPayment(buildQr({ amount: '2500.00' }));
    expect(result.ok && result.value).toMatchObject({
      source: 'bharat-qr',
      payeeVpa: 'shop@ybl',
      payeeName: 'ABC Store',
      amountPaise: 250000,
      merchantCode: '5411',
      currency: 'INR',
    });
  });

  it('works for a static code (no amount)', () => {
    const result = readUpiPayment(buildQr());
    expect(result.ok && result.value.amountPaise).toBeNull();
  });

  it('finds the VPA when it is not nested in sub-tags', () => {
    const result = readUpiPayment(buildQr({ nested: false }));
    expect(result.ok && result.value.payeeVpa).toBe('shop@ybl');
  });

  it('rejects a code whose CRC does not match (misread or tampered)', () => {
    const qr = buildQr({ amount: '100' });
    const tampered = qr.replace('shop@ybl', 'evil@ybl'); // same length, so only the CRC catches it
    const result = readUpiPayment(tampered);
    expect(result.ok || result.error.code).toBe('BHARATQR_CORRUPT');
  });

  it('rejects a truncated code', () => {
    const result = readUpiPayment(buildQr().slice(0, -12));
    expect(result.ok || result.error.code).toBe('BHARATQR_CORRUPT');
  });

  it('explains card-only BharatQR codes that carry no UPI ID', () => {
    const body =
      tlv('00', '01') + tlv('01', '11') + tlv('02', '4111111111111111') + tlv('53', '356') + tlv('59', 'Cards Only') + '6304';
    const qr = body + crc16ccitt(body).toString(16).toUpperCase().padStart(4, '0');
    const result = readUpiPayment(qr);
    expect(result.ok || result.error.code).toBe('BHARATQR_NO_UPI');
  });

  it('rejects a non-INR currency', () => {
    const result = readUpiPayment(buildQr({ currency: '840', amount: '10' }));
    expect(result.ok || result.error.code).toBe('UNSUPPORTED_CURRENCY');
  });
});
