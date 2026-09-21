import type { SplitStrategy } from '@/types/split';

/**
 * A local copy of the backend's split engine (muktpay-backend/src/split/split.engine.ts).
 *
 * Why duplicate it: a shop with no signal still has to take money. The merchant flow generates
 * QR codes from this, so it must work offline. The two copies must stay in step — both are pure
 * integer arithmetic with no randomness, so the same input gives the same output on either side,
 * and the test files assert the same cases.
 *
 * Difference from the server version: this one RETURNS failures instead of throwing, because
 * every failure here is something the merchant typed and needs to see as a form error.
 */

export interface SplitRules {
  /** Largest single payment. The customer's per-transaction cap, minus nothing. */
  maxChunkPaise: number;
  /** Smallest payment when a bill needs more than one. A tiny leftover is topped up from the one before it. */
  minChunkPaise: number;
  /** Most payments one bill may need. Long chains hit daily UPI limits and exhaust the customer's patience. */
  maxChunks: number;
  strategy: SplitStrategy;
}

export interface SplitChunk {
  /** 1-based: the order the payments are made in. */
  index: number;
  amountPaise: number;
}

export interface SplitPlan {
  totalPaise: number;
  strategy: SplitStrategy;
  chunkCount: number;
  chunks: SplitChunk[];
  /** Largest total these rules can handle (maxChunkPaise × maxChunks). */
  maxTotalPaise: number;
}

export type SplitErrorCode = 'INVALID_TOTAL' | 'INVALID_RULES' | 'TOO_MANY_CHUNKS';

export type SplitResult =
  | { ok: true; value: SplitPlan }
  | { ok: false; code: SplitErrorCode; message: string };

/** ₹1,999 — the largest amount that stays under the common ₹2,000 per-transaction cap. */
export const DEFAULT_CAP_PAISE = 1999_00;

/** Caps offered as one-tap chips. Each sits just under a round cap the customer's app might impose. */
export const CAP_PRESETS: readonly { label: string; capPaise: number }[] = [
  { label: '₹2,000 cap', capPaise: 1999_00 },
  { label: '₹5,000 cap', capPaise: 4999_00 },
  { label: '₹10,000 cap', capPaise: 9999_00 },
];

export const DEFAULT_SPLIT_RULES: SplitRules = {
  maxChunkPaise: DEFAULT_CAP_PAISE,
  minChunkPaise: 1_00, // ₹1: below this, several UPI apps refuse the transfer outright
  maxChunks: 20,
  strategy: 'greedy',
};

const isPositiveInt = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n > 0;

const STRATEGIES: readonly SplitStrategy[] = ['greedy', 'balanced'];

function checkRules(rules: SplitRules): string | null {
  if (!isPositiveInt(rules.maxChunkPaise)) return 'The cap must be a positive whole number of paise.';
  if (!isPositiveInt(rules.minChunkPaise)) return 'The minimum must be a positive whole number of paise.';
  if (!isPositiveInt(rules.maxChunks)) return 'The payment limit must be a positive whole number.';
  if (!STRATEGIES.includes(rules.strategy)) return `Unknown strategy "${String(rules.strategy)}".`;
  // The top-up rule below moves up to (min - 1) paise out of the previous payment; it must stay ≥ min.
  if (rules.maxChunkPaise < rules.minChunkPaise * 2) return 'The cap must be at least twice the minimum payment.';
  return null;
}

/** Payments needed: the smallest count that keeps every payment at or under the cap. */
export const chunkCountFor = (totalPaise: number, capPaise: number) => Math.ceil(totalPaise / capPaise);

/** Fill each payment to the cap; the leftover goes last. ₹4,500 @ ₹1,999 → 1,999 · 1,999 · 502 */
function greedy(total: number, cap: number, min: number, count: number): number[] {
  const amounts: number[] = Array<number>(count - 1).fill(cap);
  amounts.push(total - cap * (count - 1)); // always in (0, cap]

  // A 50-paise leftover can't be paid on its own: borrow from the payment before it.
  const last = count - 1;
  if (amounts[last] < min) {
    const shift = min - amounts[last];
    amounts[last] = min;
    amounts[last - 1] -= shift;
  }
  return amounts;
}

/** Equal payments, differing by at most one paisa. ₹4,500 @ ₹1,999 → 1,500 × 3 */
function balanced(total: number, count: number): number[] {
  const base = Math.floor(total / count);
  const extra = total % count; // spread the odd paise one each over the first payments
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

export function planSplit(totalPaise: number, rules: SplitRules = DEFAULT_SPLIT_RULES): SplitResult {
  const ruleProblem = checkRules(rules);
  if (ruleProblem) return { ok: false, code: 'INVALID_RULES', message: ruleProblem };

  if (!isPositiveInt(totalPaise)) {
    return { ok: false, code: 'INVALID_TOTAL', message: 'Enter an amount greater than zero.' };
  }

  const { maxChunkPaise: cap, minChunkPaise: min, maxChunks, strategy } = rules;
  const maxTotalPaise = cap * maxChunks;
  const count = chunkCountFor(totalPaise, cap);

  if (count > maxChunks) {
    return {
      ok: false,
      code: 'TOO_MANY_CHUNKS',
      message: `That would need ${count} payments. The most allowed is ${maxChunks} — raise the cap or take the rest separately.`,
    };
  }

  const amounts =
    count === 1 ? [totalPaise] : strategy === 'balanced' ? balanced(totalPaise, count) : greedy(totalPaise, cap, min, count);

  // Belt and braces. These can only fail if the arithmetic above is wrong, and a wrong plan means
  // a customer is asked for the wrong amount — never return one.
  const sum = amounts.reduce((a, b) => a + b, 0);
  if (sum !== totalPaise || amounts.some((a) => a > cap || a <= 0)) {
    throw new Error(`Split engine invariant violated (total ${totalPaise}, got ${amounts.join(',')})`);
  }

  return {
    ok: true,
    value: {
      totalPaise,
      strategy,
      chunkCount: count,
      chunks: amounts.map((amountPaise, i) => ({ index: i + 1, amountPaise })),
      maxTotalPaise,
    },
  };
}
