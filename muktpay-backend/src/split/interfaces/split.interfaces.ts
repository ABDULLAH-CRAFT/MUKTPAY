/**
 * How to cut a total into payments.
 *  - greedy:   fill each payment to the cap, the leftover goes last.  ₹6,800 → 1,999 · 1,999 · 1,999 · 803
 *  - balanced: equal payments (differing by at most 1 paisa).          ₹6,800 → 1,700 × 4
 * Both are fully deterministic: the same input always gives the same output.
 */
export type SplitStrategy = 'greedy' | 'balanced';

export const SPLIT_STRATEGIES: readonly SplitStrategy[] = ['greedy', 'balanced'];

/** All amounts are INTEGER PAISE (₹1 = 100 paise). No floats anywhere in the split code. */
export interface SplitRules {
  /** Largest single payment. Default ₹1,999. */
  maxTranchePaise: number;
  /** Smallest payment when the bill needs more than one (a tiny leftover is topped up from the previous one). */
  minTranchePaise: number;
  /** Most payments one order may need. Banks cap UPI transactions per day, so long chains fail in practice. */
  maxTranches: number;
  strategy: SplitStrategy;
}

export interface Tranche {
  /** 1-based position: the order the payments are made in. */
  index: number;
  amountPaise: number;
}

export interface SplitPlan {
  totalPaise: number;
  strategy: SplitStrategy;
  trancheCount: number;
  tranches: Tranche[];
  /** Largest total that can be split under the current rules (maxTranchePaise × maxTranches). */
  maxTotalPaise: number;
}

export type SplitErrorCode = 'INVALID_TOTAL' | 'INVALID_RULES' | 'TOO_MANY_TRANCHES';
