import { describe, expect, it } from 'vitest';
import { chunkCountFor, DEFAULT_SPLIT_RULES, planSplit, type SplitRules } from './splitEngine';

const rules = (overrides: Partial<SplitRules> = {}): SplitRules => ({ ...DEFAULT_SPLIT_RULES, ...overrides });

/** Convenience: the plan's amounts, or throw so a failed plan can't silently pass a test. */
function amounts(totalPaise: number, overrides: Partial<SplitRules> = {}): number[] {
  const result = planSplit(totalPaise, rules(overrides));
  if (!result.ok) throw new Error(`expected a plan, got ${result.code}: ${result.message}`);
  return result.value.chunks.map((c) => c.amountPaise);
}

describe('planSplit — greedy (default)', () => {
  it('leaves an amount under the cap as a single payment', () => {
    expect(amounts(1500_00)).toEqual([1500_00]);
  });

  it('fills each payment to the cap and puts the remainder last', () => {
    // ₹4,500 at a ₹1,999 cap
    expect(amounts(4500_00)).toEqual([1999_00, 1999_00, 502_00]);
  });

  it('handles an exact multiple of the cap with no stray payment', () => {
    expect(amounts(3998_00)).toEqual([1999_00, 1999_00]);
  });

  it('tops up a leftover too small to pay on its own', () => {
    // ₹1,999.50 would otherwise end in a 50-paise payment, which several UPI apps refuse.
    expect(amounts(1999_50)).toEqual([1998_50, 1_00]);
  });
});

describe('planSplit — balanced', () => {
  it('splits into equal payments', () => {
    expect(amounts(4500_00, { strategy: 'balanced' })).toEqual([1500_00, 1500_00, 1500_00]);
  });

  it('spreads odd paise one each over the earliest payments', () => {
    const result = amounts(1000_01, { strategy: 'balanced', maxChunkPaise: 500_00 });
    expect(result).toEqual([333_34, 333_34, 333_33]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(1000_01);
  });
});

describe('planSplit — invariants', () => {
  const totals = [1, 99, 100, 1999_00, 1999_01, 4500_00, 6800_00, 12345_67, 39980_00];

  it.each(totals)('every plan for %i paise sums exactly and respects the cap', (total) => {
    for (const strategy of ['greedy', 'balanced'] as const) {
      const result = planSplit(total, rules({ strategy }));
      if (!result.ok) continue; // too-large totals are tested separately
      const list = result.value.chunks.map((c) => c.amountPaise);
      expect(list.reduce((a, b) => a + b, 0)).toBe(total);
      expect(Math.max(...list)).toBeLessThanOrEqual(DEFAULT_SPLIT_RULES.maxChunkPaise);
      expect(Math.min(...list)).toBeGreaterThan(0);
      expect(result.value.chunks.map((c) => c.index)).toEqual(list.map((_, i) => i + 1));
    }
  });

  it('is deterministic — the same input always gives the same plan', () => {
    expect(amounts(6800_00)).toEqual(amounts(6800_00));
  });
});

describe('planSplit — rejections', () => {
  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects %p as a total', (total) => {
    const result = planSplit(total, rules());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_TOTAL');
  });

  it('rejects a total needing more payments than allowed', () => {
    const result = planSplit(1999_00 * 21, rules());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('TOO_MANY_CHUNKS');
  });

  it('accepts the largest total the rules can handle', () => {
    const result = planSplit(1999_00 * 20, rules());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.chunkCount).toBe(20);
  });

  it('rejects a cap smaller than twice the minimum', () => {
    const result = planSplit(500_00, rules({ maxChunkPaise: 150, minChunkPaise: 100 }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_RULES');
  });
});

describe('chunkCountFor', () => {
  it('rounds up', () => {
    expect(chunkCountFor(4500_00, 1999_00)).toBe(3);
    expect(chunkCountFor(3998_00, 1999_00)).toBe(2);
    expect(chunkCountFor(1, 1999_00)).toBe(1);
  });
});
