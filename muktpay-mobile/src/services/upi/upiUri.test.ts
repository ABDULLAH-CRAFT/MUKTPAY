import { describe, expect, it } from 'vitest';
import { buildUpiLink, checkLaunchAmount, InvalidPaymentError } from './upiUri';
import { readUpiPayment } from './index';
import type { UpiPayment } from './types';

const pay = (raw: string): UpiPayment => {
  const result = readUpiPayment(raw);
  if (!result.ok) throw new Error(result.error.code);
  return result.value;
};

describe('buildUpiLink: rebuild mode (changed amount / tranche)', () => {
  it('produces the link from the plan: merchant + amount become a upi:// URI', () => {
    const link = buildUpiLink(pay('upi://pay?pa=shop@ybl&pn=Shop&am=6800'), { amountPaise: 199900 });
    expect(link.url).toBe('upi://pay?pa=shop@ybl&pn=Shop&am=1999.00&cu=INR');
    expect(link.preservedOriginal).toBe(false);
  });

  it('formats paise correctly', () => {
    const p = pay('upi://pay?pa=shop@ybl');
    expect(buildUpiLink(p, { amountPaise: 80300 }).url).toContain('am=803.00');
    expect(buildUpiLink(p, { amountPaise: 199950 }).url).toContain('am=1999.50');
    expect(buildUpiLink(p, { amountPaise: 5 }).url).toContain('am=0.05');
  });

  it('drops sign, order reference and other merchant-specific fields when the amount changes', () => {
    const p = pay('upi://pay?pa=shop@ybl&pn=Shop&am=6800&tr=ORDER123&sign=abc&mode=02&orgid=000000&mc=5411');
    const url = buildUpiLink(p, { amountPaise: 199900 }).url;
    expect(url).toContain('mc=5411');
    for (const dropped of ['sign', 'tr=', 'mode', 'orgid']) expect(url).not.toContain(dropped);
  });

  it('keeps @ readable in the payee address', () => {
    expect(buildUpiLink(pay('upi://pay?pa=shop@ybl'), { amountPaise: 100 }).url).toContain('pa=shop@ybl&');
  });

  it('percent-encodes names and notes so they cannot inject extra fields', () => {
    const p = pay('upi://pay?pa=shop@ybl&pn=' + encodeURIComponent('Ab & Sons=1&am=1'));
    const url = buildUpiLink(p, { amountPaise: 250000, note: 'A&B=C #1' }).url;
    expect(url).toBe('upi://pay?pa=shop@ybl&pn=Ab%20%26%20Sons%3D1%26am%3D1&am=2500.00&cu=INR&tn=A%26B%3DC%20%231');
    // exactly one am= field survives
    expect(url.match(/[?&]am=/g)).toHaveLength(1);
  });

  it('omits the name when the QR had none (it would be our own guess)', () => {
    expect(buildUpiLink(pay('upi://pay?pa=shop@ybl'), { amountPaise: 100 }).url).not.toContain('pn=');
  });

  it('caps and cleans notes at 80 characters', () => {
    const url = buildUpiLink(pay('upi://pay?pa=shop@ybl'), { amountPaise: 100, note: 'x'.repeat(200) }).url;
    expect(decodeURIComponent(url.split('tn=')[1])).toHaveLength(80);
  });

  it('carries the QR note forward unless overridden', () => {
    const p = pay('upi://pay?pa=shop@ybl&tn=Order%2042');
    expect(buildUpiLink(p, { amountPaise: 100 }).url).toContain('tn=Order%2042');
    expect(buildUpiLink(p, { amountPaise: 100, note: 'Split 1/4' }).url).toContain('tn=Split%201%2F4');
  });

  it('can target app-specific schemes for iOS', () => {
    const p = pay('upi://pay?pa=shop@ybl');
    expect(buildUpiLink(p, { amountPaise: 100, scheme: 'phonepe' }).url).toMatch(/^phonepe:\/\/pay\?/);
    expect(buildUpiLink(p, { amountPaise: 100, scheme: 'gpay' }).url).toMatch(/^gpay:\/\/upi\/pay\?/);
    expect(buildUpiLink(p, { amountPaise: 100, scheme: 'paytm' }).url).toMatch(/^paytmmp:\/\/pay\?/);
  });
});

describe('buildUpiLink: pass-through mode (paying exactly what the QR says)', () => {
  it('forwards the original query byte-for-byte, keeping the signature intact', () => {
    const sign = 'AbC+dEf/gHi==';
    const query = `pa=shop@ybl&pn=Shop&am=6800&tr=ORDER123&sign=${sign}&mode=02`;
    const link = buildUpiLink(pay(`upi://pay?${query}`), { amountPaise: 680000 });
    expect(link.preservedOriginal).toBe(true);
    expect(link.url).toBe(`upi://pay?${query}`);
    expect(link.url).toContain(sign); // a "+" must not have turned into a space
  });

  it('switches to rebuild as soon as the amount differs', () => {
    const link = buildUpiLink(pay('upi://pay?pa=shop@ybl&am=6800&sign=abc'), { amountPaise: 100 });
    expect(link.preservedOriginal).toBe(false);
    expect(link.url).not.toContain('sign');
  });

  it('switches to rebuild when a custom note is requested', () => {
    expect(buildUpiLink(pay('upi://pay?pa=shop@ybl&am=100'), { amountPaise: 10000, note: 'hi' }).preservedOriginal).toBe(false);
  });

  it('never passes through a QR that had no amount (the user chose one)', () => {
    expect(buildUpiLink(pay('upi://pay?pa=shop@ybl'), { amountPaise: 500 }).preservedOriginal).toBe(false);
  });
});

describe('buildUpiLink: BharatQR source', () => {
  it('has no original link to pass through, so it always rebuilds', () => {
    // hand-built minimal payment as if scanned from BharatQR
    const p: UpiPayment = {
      source: 'bharat-qr',
      payeeVpa: 'shop@ybl',
      payeeName: 'ABC Store',
      nameFromQr: true,
      amountPaise: 250000,
      currency: 'INR',
      note: null,
      merchantCode: '5411',
      transactionRef: null,
      issuer: null,
      params: {},
      rawQuery: null,
    };
    const link = buildUpiLink(p, { amountPaise: 250000 });
    expect(link.preservedOriginal).toBe(false);
    expect(link.url).toBe('upi://pay?pa=shop@ybl&pn=ABC%20Store&mc=5411&am=2500.00&cu=INR');
  });
});

describe('amount safety', () => {
  it.each([0, -100, 1.5, NaN, Infinity, 500_000 * 100 + 1])('refuses to build a link for %s paise', (amount) => {
    expect(() => buildUpiLink(pay('upi://pay?pa=shop@ybl'), { amountPaise: amount })).toThrow(InvalidPaymentError);
    expect(checkLaunchAmount(amount)).not.toBeNull();
  });

  it('allows the boundaries', () => {
    expect(checkLaunchAmount(1)).toBeNull();
    expect(checkLaunchAmount(500_000 * 100)).toBeNull();
  });
});
