import type { SplitErrorCode, SplitPlan, SplitRules, SplitStrategy, Tranche } from './interfaces/split.interfaces';
import { SPLIT_STRATEGIES } from './interfaces/split.interfaces';

/**
 * The split engine: pure functions, no framework, no I/O, no randomness, no floats.
 * Everything that decides "how much is each payment" lives here so it can be tested exhaustively.
 */

export const DEFAULT_SPLIT_RULES: SplitRules = {
  maxTranchePaise: 1999_00, // ₹1,999
  minTranchePaise: 1_00, // ₹1
  maxTranches: 20,
  strategy: 'greedy',
};

export class SplitError extends Error {
  constructor(
    readonly code: SplitErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'SplitError';
  }
}

const isPositiveInt = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n > 0;

export function assertValidRules(rules: SplitRules): void {
  const bad = (message: string) => {
    throw new SplitError('INVALID_RULES', message);
  };
  if (!isPositiveInt(rules.maxTranchePaise)) bad('maxTranchePaise must be a positive integer');
  if (!isPositiveInt(rules.minTranchePaise)) bad('minTranchePaise must be a positive integer');
  if (!isPositiveInt(rules.maxTranches)) bad('maxTranches must be a positive integer');
  if (!SPLIT_STRATEGIES.includes(rules.strategy)) bad(`Unknown strategy "${String(rules.strategy)}"`);
  // The top-up rule moves up to (min - 1) paise out of the previous payment; it must stay ≥ min.
  if (rules.maxTranchePaise < rules.minTranchePaise * 2) bad('maxTranchePaise must be at least twice minTranchePaise');
}

/** Payments needed for a total: the smallest count that keeps every payment ≤ the cap. */
export const trancheCountFor = (totalPaise: number, maxTranchePaise: number) => Math.ceil(totalPaise / maxTranchePaise);

function greedy(total: number, cap: number, min: number, count: number): number[] {
  const amounts: number[] = Array<number>(count - 1).fill(cap);
  amounts.push(total - cap * (count - 1)); // leftover: always in (0, cap]

  // A tiny leftover (e.g. 50 paise) can't be paid on its own: top it up from the payment before it.
  const last = count - 1;
  if (count > 1 && amounts[last] < min) {
    const shift = min - amounts[last];
    amounts[last] = min;
    amounts[last - 1] -= shift;
  }
  return amounts;
}

function balanced(total: number, count: number): number[] {
  const base = Math.floor(total / count);
  const extra = total % count; // spread the leftover paise one each over the first payments
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

export function planSplit(totalPaise: number, rules: SplitRules = DEFAULT_SPLIT_RULES): SplitPlan {
  assertValidRules(rules);
  if (!isPositiveInt(totalPaise)) {
    throw new SplitError('INVALID_TOTAL', 'The total must be a positive whole number of paise.');
  }

  const { maxTranchePaise: cap, minTranchePaise: min, maxTranches, strategy } = rules;
  const maxTotalPaise = cap * maxTranches;
  const count = trancheCountFor(totalPaise, cap);

  if (count > maxTranches) {
    throw new SplitError(
      'TOO_MANY_TRANCHES',
      `This amount needs ${count} payments; the most allowed is ${maxTranches}.`,
    );
  }

  const amounts = count === 1 ? [totalPaise] : strategy === 'balanced' ? balanced(totalPaise, count) : greedy(totalPaise, cap, min, count);

  const tranches: Tranche[] = amounts.map((amountPaise, i) => ({ index: i + 1, amountPaise }));

  // Belt and braces: these can only fail if the algorithm above is wrong. Never return a bad plan.
  const sum = amounts.reduce((a, b) => a + b, 0);
  if (sum !== totalPaise || amounts.some((a) => a > cap || a <= 0)) {
    throw new Error(`Split engine invariant violated (total ${totalPaise}, got ${amounts.join(',')})`);
  }

  return { totalPaise, strategy: strategy as SplitStrategy, trancheCount: count, tranches, maxTotalPaise };
}
