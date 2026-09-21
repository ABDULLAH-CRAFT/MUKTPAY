import { describe, expect, it } from 'vitest';
import { checkVpa, normalizeShopName, validateShopName } from './validateMerchantProfile';

describe('checkVpa', () => {
  it('accepts a well-formed UPI ID and names the issuer', () => {
    expect(checkVpa('guptakirana@okhdfcbank')).toEqual({
      ok: true,
      vpa: 'guptakirana@okhdfcbank',
      issuerLabel: 'Google Pay · HDFC Bank',
    });
  });

  it('lowercases what the merchant typed', () => {
    const result = checkVpa('SHOP@YBL');
    expect(result.ok).toBe(true);
    expect(result.vpa).toBe('shop@ybl'); // the stored form must match what goes in `pa`
    expect(result.issuerLabel).toBe('PhonePe · Yes Bank');
  });

  it('accepts an unknown handle — new ones appear all the time', () => {
    const result = checkVpa('shop@zzzunknown');
    expect(result.ok).toBe(true);
    expect(result.issuerLabel).toBeNull();
  });

  it('rejects a username shorter than the UPI minimum', () => {
    expect(checkVpa('a@ybl').ok).toBe(false);
  });

  it.each([
    ['', 'Enter your UPI ID'],
    ['shopybl', 'A UPI ID looks like shop@ybl'],
    ['shop @ybl', 'A UPI ID has no spaces'],
    ['upi://pay?pa=shop@ybl', 'Enter just the UPI ID, like shop@ybl — not a full link'],
  ])('rejects %j', (input, message) => {
    const result = checkVpa(input);
    expect(result.ok).toBe(false);
    expect(result.message).toBe(message);
  });

  it('never returns a vpa when the check failed', () => {
    for (const bad of ['', 'nope', 'a@ybl', 'https://example.com']) {
      expect(checkVpa(bad).vpa).toBe('');
    }
  });
});

describe('shop name', () => {
  it('collapses whitespace before storing', () => {
    expect(normalizeShopName('  Gupta   Kirana  ')).toBe('Gupta Kirana');
  });

  it('accepts a normal name', () => {
    expect(validateShopName('  Gupta   Kirana  ')).toBeUndefined();
  });

  it.each([
    ['', 'Enter the name customers should see'],
    ['A', 'Use at least 2 characters'],
    ['x'.repeat(60), 'Use at most 50 characters'],
  ])('rejects %j', (input, message) => {
    expect(validateShopName(input)).toBe(message);
  });

  it('strips invisible characters that could spoof the displayed name', () => {
    expect(normalizeShopName('Gupta\u200bKirana')).toBe('GuptaKirana');
  });
});
