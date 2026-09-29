import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { SPLIT_STRATEGIES, type SplitStrategy } from '../../split/interfaces/split.interfaces';

/** Mirrors SplitPreviewDto on purpose: creating a bill must accept exactly what preview accepted,
 *  so a merchant never sees one plan on the preview screen and a different one on the QR codes. */
export class CreateBillDto {
  @IsInt()
  @Min(1)
  @Max(1_000_000_00)
  totalPaise!: number;

  @IsOptional()
  @IsInt()
  @Min(100_00)
  @Max(1999_99)
  capPaise?: number;

  @IsOptional()
  @IsIn(SPLIT_STRATEGIES as readonly string[])
  strategy?: SplitStrategy;

  /** Free-text label, e.g. "Ramesh, order 12". Purely for the merchant's own reference/search. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  note?: string;
}