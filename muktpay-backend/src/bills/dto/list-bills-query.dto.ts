import { Type } from 'class-transformer';
import { IsIn, IsISO8601, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

const BILL_STATUSES = ['open', 'settled', 'cancelled', 'expired'] as const;

export class ListBillsQueryDto {
  @IsOptional()
  @IsIn(BILL_STATUSES as readonly string[])
  status?: (typeof BILL_STATUSES)[number];

  /** Matches against the bill's ref or note, case-insensitively. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  search?: string;

  /** Bills created on/after this instant. */
  @IsOptional()
  @IsISO8601()
  from?: string;

  /** Bills created before this instant. */
  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /** The `nextCursor` from the previous page: the id of the last bill that page returned. */
  @IsOptional()
  @IsUUID()
  cursor?: string;
}