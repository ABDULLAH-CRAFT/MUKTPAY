import { describe, expect, it } from 'vitest';
import { formatIndianInteger, formatPaise, paiseToUpiAmount, parseRupeesToPaise } from './money';

describe('formatIndianInteger', () => {
  it.each([
    [999, '999'],
    [1000, '1,000'],
    [123456, '1,23,456'],
    [1999900, '19,99,900'],
    [12345678, '1,23,45,678'],
  ])('%i → %s', (input, expected) => expect(formatIndianInteger(input)).toBe(expected));
});

describe('formatPaise', () => {
  it('formats whole rupees without decimals', () => expect(formatPaise(680000)).toBe('₹6,800'));
  it('shows paise when present', () => expect(formatPaise(199950)).toBe('₹1,999.50'));
  it('pads single-digit paise', () => expect(formatPaise(5)).toBe('₹0.05'));
  it('can force decimals', () => expect(formatPaise(0, { alwaysShowDecimals: true })).toBe('₹0.00'));
  it('handles negatives', () => expect(formatPaise(-250000)).toBe('-₹2,500'));
});

describe('parseRupeesToPaise', () => {
  it.each([
    ['₹1,999', 199900],
    ['1999.5', 199950],
    ['0.07', 7],
    ['1999.00', 199900],
  ])('%s → %i', (input, expected) => expect(parseRupeesToPaise(input)).toBe(expected));

  it.each(['12.345', 'abc', '', '-5', '1e3', '1..5'])('rejects %j', (input) =>
    expect(parseRupeesToPaise(input)).toBeNull(),
  );
});

describe('paiseToUpiAmount', () => {
  it.each([
    [199900, '1999.00'],
    [199950, '1999.50'],
    [5, '0.05'],
    [100, '1.00'],
    [50000000, '500000.00'],
  ])('%i → %s', (paise, expected) => expect(paiseToUpiAmount(paise)).toBe(expected));
});
