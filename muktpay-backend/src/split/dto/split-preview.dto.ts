import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { SPLIT_STRATEGIES, type SplitStrategy } from '../interfaces/split.interfaces';

export class SplitPreviewDto {
  /** Bill total in integer paise: ₹6,800 → 680000. */
  @IsInt()
  @Min(1)
  @Max(1_000_000_00) // sanity bound only; the engine gives the friendly "too many payments" error
  totalPaise!: number;

  /** Lower the per-payment cap (e.g. your UPI app limits you). Can never exceed ₹1,999.99. */
  @IsOptional()
  @IsInt()
  @Min(100_00) // ₹100
  @Max(1999_99) // ₹1,999.99: always under ₹2,000
  maxTranchePaise?: number;

  @IsOptional()
  @IsIn(SPLIT_STRATEGIES as readonly string[])
  strategy?: SplitStrategy;
}
