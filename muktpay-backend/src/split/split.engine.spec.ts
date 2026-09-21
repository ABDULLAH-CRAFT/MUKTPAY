import { DEFAULT_SPLIT_RULES, planSplit, SplitError, trancheCountFor } from './split.engine';
import type { SplitRules } from './interfaces/split.interfaces';

const amounts = (total: number, rules: Partial<SplitRules> = {}) =>
  planSplit(total, { ...DEFAULT_SPLIT_RULES, ...rules }).tranches.map((t) => t.amountPaise);
const rupees = (...values: number[]) => values.map((v) => Math.round(v * 100));

describe('planSplit: the plan example', () => {
  it('₹6,800 → ₹1,999 · ₹1,999 · ₹1,999 · ₹803', () => {
    expect(amounts(680000)).toEqual(rupees(1999, 1999, 1999, 803));
  });

  it('numbers payments from 1 in payment order', () => {
    const plan = planSplit(680000);
    expect(plan.tranches.map((t) => t.index)).toEqual([1, 2, 3, 4]);
    expect(plan.trancheCount).toBe(4);
    expect(plan.strategy).toBe('greedy');
  });
});

describe('planSplit: greedy (default)', () => {
  it('keeps a bill under the cap as ONE payment', () => {
    expect(amounts(150000)).toEqual([150000]);
    expect(amounts(199900)).toEqual([199900]); // exactly the cap
  });

  it('splits just over the cap into two', () => {
    expect(amounts(199900 + 5000)).toEqual([199900, 5000]);
  });

  it('a 1 paisa leftover is topped up to the ₹1 minimum, taken from the payment before it', () => {
    expect(amounts(199901)).toEqual([199801, 100]);
  });

  it('handles an exact multiple of the cap', () => {
    expect(amounts(199900 * 3)).toEqual([199900, 199900, 199900]);
  });

  it('keeps paise exact (no floating point drift)', () => {
    expect(amounts(680050)).toEqual([199900, 199900, 199900, 80350]);
    expect(amounts(10).reduce((a, b) => a + b)).toBe(10);
  });

  it('tops up a tiny leftover from the previous payment instead of a 50 paise payment', () => {
    // 3 × ₹1,999 = 599,700 paise; +50 paise → leftover 50 paise < ₹1 minimum
    expect(amounts(599700 + 50)).toEqual([199900, 199900, 199850, 100]);
  });

  it('never produces a payment below the minimum when there are several', () => {
    for (const leftover of [1, 50, 99, 100, 101]) {
      const parts = amounts(199900 + leftover);
      expect(Math.min(...parts)).toBeGreaterThanOrEqual(100);
      expect(parts.reduce((a, b) => a + b)).toBe(199900 + leftover);
    }
  });
});

describe('planSplit: balanced', () => {
  it('₹6,800 → 4 × ₹1,700', () => {
    expect(amounts(680000, { strategy: 'balanced' })).toEqual(rupees(1700, 1700, 1700, 1700));
  });

  it('spreads leftover paise one each, largest first', () => {
    // 400,003 paise needs 3 payments: 133,334 each, and the 1 extra paisa goes to the first
    expect(amounts(400003, { strategy: 'balanced' })).toEqual([133335, 133334, 133334]);
  });

  it('uses the same (minimum) number of payments as greedy', () => {
    expect(amounts(680000, { strategy: 'balanced' })).toHaveLength(amounts(680000).length);
  });

  it('still returns one payment when the bill fits under the cap', () => {
    expect(amounts(150000, { strategy: 'balanced' })).toEqual([150000]);
  });
});

describe('planSplit: limits', () => {
  it('refuses more payments than allowed, with a clear message', () => {
    const tooBig = 199900 * 20 + 1;
    expect(() => planSplit(tooBig)).toThrow(SplitError);
    expect(() => planSplit(tooBig)).toThrow(/needs 21 payments; the most allowed is 20/);
  });

  it('accepts exactly the maximum', () => {
    expect(planSplit(199900 * 20).trancheCount).toBe(20);
  });

  it('reports the maximum total for the current rules', () => {
    expect(planSplit(100).maxTotalPaise).toBe(199900 * 20);
  });

  it('honours a lower cap', () => {
    expect(amounts(500000, { maxTranchePaise: 100000 })).toEqual(rupees(1000, 1000, 1000, 1000, 1000));
  });
});

describe('planSplit: rejects bad input', () => {
  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 2, '100' as unknown as number, null as unknown as number])(
    'total %p',
    (total) => {
      expect(() => planSplit(total)).toThrow(expect.objectContaining({ code: 'INVALID_TOTAL' }));
    },
  );

  it.each<[string, Partial<SplitRules>]>([
    ['zero cap', { maxTranchePaise: 0 }],
    ['fractional cap', { maxTranchePaise: 100.5 }],
    ['zero min', { minTranchePaise: 0 }],
    ['zero max payments', { maxTranches: 0 }],
    ['unknown strategy', { strategy: 'random' as never }],
    ['cap smaller than twice the minimum', { maxTranchePaise: 150, minTranchePaise: 100 }],
  ])('rules: %s', (_label, rules) => {
    expect(() => planSplit(100000, { ...DEFAULT_SPLIT_RULES, ...rules })).toThrow(
      expect.objectContaining({ code: 'INVALID_RULES' }),
    );
  });
});

describe('planSplit: determinism', () => {
  it('gives the same answer every time (no randomness)', () => {
    const runs = Array.from({ length: 50 }, () => JSON.stringify(planSplit(680000)));
    expect(new Set(runs).size).toBe(1);
  });
});

describe('planSplit: invariants hold for 20,000 random cases', () => {
  // Small seeded PRNG so a failure is reproducible.
  let seed = 123456789;
  const random = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const between = (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1));

  it('sum exact · every payment within [min, cap] · minimal payment count · order stable', () => {
    for (let i = 0; i < 20_000; i++) {
      const min = between(1, 500);
      const cap = between(min * 2, 199_999);
      const maxTranches = between(1, 40);
      const strategy = random() < 0.5 ? 'greedy' : 'balanced';
      const rules: SplitRules = { maxTranchePaise: cap, minTranchePaise: min, maxTranches, strategy };
      const total = between(1, cap * maxTranches);

      const plan = planSplit(total, rules);
      const parts = plan.tranches.map((t) => t.amountPaise);
      const ctx = JSON.stringify({ total, rules, parts });

      expect({ ctx, sum: parts.reduce((a, b) => a + b, 0) }).toEqual({ ctx, sum: total });
      expect(plan.trancheCount).toBe(trancheCountFor(total, cap));
      expect(parts).toHaveLength(plan.trancheCount);
      for (const p of parts) {
        expect({ ctx, ok: Number.isInteger(p) && p <= cap && p > 0 }).toEqual({ ctx, ok: true });
        if (parts.length > 1) expect({ ctx, ok: p >= min }).toEqual({ ctx, ok: true });
      }
      if (strategy === 'balanced') expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
    }
  });
});
