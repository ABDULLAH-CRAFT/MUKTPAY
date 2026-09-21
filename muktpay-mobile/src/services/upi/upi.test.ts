import { describe, expect, it } from 'vitest';
import { crc16ccitt } from './crc16';
import { readUpiInput, readUpiPayment, MAX_UPI_AMOUNT_PAISE } from './index';
import { parseUpiPayload } from './upiParser';

const ok = (raw: string) => {
  const result = readUpiPayment(raw);
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`);
  return result.value;
};
const errorCode = (raw: string) => {
  const result = readUpiPayment(raw);
  return result.ok ? 'OK' : result.error.code;
};

describe('UPI link parsing', () => {
  it('reads the example from the plan', () => {
    const p = ok('upi://pay?pa=shop@ybl&pn=Shop&am=2500&cu=INR');
    expect(p).toMatchObject({
      payeeVpa: 'shop@ybl',
      payeeName: 'Shop',
      nameFromQr: true,
      amountPaise: 250000,
      currency: 'INR',
      source: 'upi-uri',
      issuer: { app: 'PhonePe', bank: 'Yes Bank' },
    });
  });

  it('decodes percent-encoding and plus signs in names', () => {
    expect(ok('upi://pay?pa=a.b@okaxis&pn=Gupta%20Kirana%20Store').payeeName).toBe('Gupta Kirana Store');
    expect(ok('upi://pay?pa=a.b@okaxis&pn=Sharma+Sweets').payeeName).toBe('Sharma Sweets');
  });

  it('handles decimal amounts exactly (integer paise, no float error)', () => {
    expect(ok('upi://pay?pa=a1@ybl&am=1999.50').amountPaise).toBe(199950);
    expect(ok('upi://pay?pa=a1@ybl&am=0.10').amountPaise).toBe(10);
    expect(ok('upi://pay?pa=a1@ybl&am=19.99').amountPaise).toBe(1999);
  });

  it('treats a missing or empty amount as "payer enters it"', () => {
    expect(ok('upi://pay?pa=a1@ybl').amountPaise).toBeNull();
    expect(ok('upi://pay?pa=a1@ybl&am=').amountPaise).toBeNull();
  });

  it('is case-insensitive for the scheme and field names, and lowercases the VPA', () => {
    const p = ok('UPI://PAY?PA=Shop@YBL&PN=X&AM=10');
    expect(p.payeeVpa).toBe('shop@ybl');
    expect(p.amountPaise).toBe(1000);
  });

  it('accepts upi:pay? without slashes, and quoted payloads', () => {
    expect(ok('upi:pay?pa=a1@ybl').payeeVpa).toBe('a1@ybl');
    expect(ok('"upi://pay?pa=a1@ybl"').payeeVpa).toBe('a1@ybl');
  });

  it('derives a display name from the VPA when the QR has none', () => {
    const p = ok('upi://pay?pa=guptakirana@okhdfcbank');
    expect(p.payeeName).toBe('Guptakirana');
    expect(p.nameFromQr).toBe(false);
  });

  it('keeps the original fields for later reconstruction', () => {
    const p = ok('upi://pay?pa=a1@ybl&mc=5411&tr=T123&mode=02&sign=abc');
    expect(p.params).toMatchObject({ mc: '5411', tr: 'T123', mode: '02', sign: 'abc' });
    expect(p.merchantCode).toBe('5411');
    expect(p.transactionRef).toBe('T123');
  });
});

describe('rejecting things that are not safe UPI payments', () => {
  it.each([
    ['https://evil.example/pay?pa=a@ybl', 'NOT_UPI'],
    ['javascript:alert(1)', 'NOT_UPI'],
    ['hello world', 'NOT_UPI'],
    ['', 'EMPTY'],
    ['   ', 'EMPTY'],
    ['upi://mandate?pa=a1@ybl&am=100', 'UNSUPPORTED_ACTION'],
    ['upi://pay', 'MISSING_PAYEE'],
    ['upi://pay?pn=Shop&am=10', 'MISSING_PAYEE'],
    ['upi://pay?pa=nohandle', 'INVALID_VPA'],
    ['upi://pay?pa=a@ybl', 'INVALID_VPA'], // identifier too short
    ['upi://pay?pa=a1@1ybl', 'INVALID_VPA'], // handle must start with a letter
    ['upi://pay?pa=a b@ybl', 'INVALID_VPA'],
    ['upi://pay?pa=a1@ybl&cu=USD', 'UNSUPPORTED_CURRENCY'],
    ['upi://pay?pa=a1@ybl&am=abc', 'INVALID_AMOUNT'],
    ['upi://pay?pa=a1@ybl&am=0', 'INVALID_AMOUNT'],
    ['upi://pay?pa=a1@ybl&am=-50', 'INVALID_AMOUNT'],
    ['upi://pay?pa=a1@ybl&am=10.999', 'INVALID_AMOUNT'],
    ['upi://pay?pa=a1@ybl&am=500000.01', 'AMOUNT_TOO_HIGH'],
    ['upi://pay?pa=a1@ybl&pn=%E0%A4%A', 'BAD_ENCODING'],
  ])('%j → %s', (raw, code) => expect(errorCode(raw)).toBe(code));

  it('accepts the maximum amount exactly', () => {
    expect(ok('upi://pay?pa=a1@ybl&am=500000').amountPaise).toBe(MAX_UPI_AMOUNT_PAISE);
  });

  it('rejects repeated fields (payee-swap spoofing)', () => {
    expect(errorCode('upi://pay?pa=good@ybl&pa=evil@ybl')).toBe('DUPLICATE_FIELD');
    expect(errorCode('upi://pay?pa=good@ybl&am=10&AM=99999')).toBe('DUPLICATE_FIELD');
  });

  it('never silently drops an invalid amount', () => {
    expect(errorCode('upi://pay?pa=a1@ybl&am=1O0')).toBe('INVALID_AMOUNT'); // letter O
  });

  it('rejects absurdly long payloads', () => {
    expect(errorCode(`upi://pay?pa=a1@ybl&tn=${'x'.repeat(3000)}`)).toBe('NOT_UPI');
  });
});

describe('sanitising attacker-controlled text', () => {
  it('strips bidi overrides, zero-width and control characters from names', () => {
    const p = ok('upi://pay?pa=a1@ybl&pn=' + encodeURIComponent('Sh\u202Eop\u200B\u0007 Name'));
    expect(p.payeeName).toBe('Shop Name');
  });

  it('collapses whitespace and caps name length', () => {
    expect(ok('upi://pay?pa=a1@ybl&pn=A%20%20%20B').payeeName).toBe('A B');
    expect(ok(`upi://pay?pa=a1@ybl&pn=${'N'.repeat(500)}`).payeeName).toHaveLength(100);
  });

  it('falls back to the VPA username if the name is only invisible characters', () => {
    const p = ok('upi://pay?pa=realshop@ybl&pn=' + encodeURIComponent('\u200B\u200B'));
    expect(p.nameFromQr).toBe(false);
    expect(p.payeeName).toBe('Realshop');
  });

  it('does not echo unsafe text unbounded in error messages', () => {
    const result = readUpiPayment(`upi://pay?pa=${'z'.repeat(200)}`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message.length).toBeLessThan(120);
  });
});

describe('manual entry', () => {
  it('accepts a bare UPI ID', () => {
    const result = readUpiInput('  Shop@YBL ');
    expect(result.ok && result.value.payeeVpa).toBe('shop@ybl');
  });
  it('accepts a full link', () => {
    const result = readUpiInput('upi://pay?pa=shop@ybl&am=100');
    expect(result.ok && result.value.amountPaise).toBe(10000);
  });
  it('rejects nonsense', () => {
    expect(readUpiInput('not a upi id').ok).toBe(false);
    expect(readUpiInput('').ok).toBe(false);
  });
});

describe('parser vs validator separation', () => {
  it('parser extracts without judging', () => {
    const parsed = parseUpiPayload('upi://pay?pa=nohandle&am=abc');
    expect(parsed.ok).toBe(true); // structurally fine; the validator rejects it
  });
});

describe('crc16ccitt', () => {
  it('matches the standard CRC-16/CCITT-FALSE check value', () => {
    expect(crc16ccitt('123456789')).toBe(0x29b1);
  });
});
