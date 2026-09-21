export type SplitStrategy = 'greedy' | 'balanced';

export interface SplitTranche {
  index: number;
  amountPaise: number;
}

/** Response of POST /split/preview. The server decides the amounts; the app only displays them. */
export interface SplitPlan {
  totalPaise: number;
  strategy: SplitStrategy;
  trancheCount: number;
  tranches: SplitTranche[];
  maxTotalPaise: number;
  warnings: string[];
}
