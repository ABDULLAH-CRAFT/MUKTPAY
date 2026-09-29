import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BillService } from './bill.service';
import { BillsSummaryQueryDto } from './dto/bills-summary-query.dto';
import { CreateBillDto } from './dto/create-bill.dto';
import { ListBillsQueryDto } from './dto/list-bills-query.dto';
import { UpdateChunkStatusDto } from './dto/update-chunk-status.dto';

@Controller('bills')
export class BillController {
  constructor(private readonly bills: BillService) {}

  /**
   * Creates a real, persisted bill from the same engine /split/preview used.
   * Send an `Idempotency-Key` header to make retries safe: the same key returns the same bill.
   */
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBillDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.bills.create(user.id, dto, idempotencyKey);
  }

  /** The calling merchant's own bills, newest first, one page at a time. */
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListBillsQueryDto) {
    return this.bills.list(user.id, query);
  }

  // Declared before ':ref' on purpose — otherwise "summary" would be matched as a ref.
  /** Invoiced vs. actually collected for a date range, e.g. "today's collections". */
  @Get('summary')
  summary(@CurrentUser() user: AuthUser, @Query() query: BillsSummaryQueryDto) {
    return this.bills.summary(user.id, query.from, query.to);
  }

  @Get(':ref')
  findOne(@CurrentUser() user: AuthUser, @Param('ref') ref: string) {
    return this.bills.findOwnedByRef(user.id, ref);
  }

  /** What happened to this bill and when, newest first. */
  @Get(':ref/events')
  events(@CurrentUser() user: AuthUser, @Param('ref') ref: string) {
    return this.bills.events(user.id, ref);
  }

  @Patch(':ref/chunks/:index')
  updateChunk(
    @CurrentUser() user: AuthUser,
    @Param('ref') ref: string,
    @Param('index', ParseIntPipe) index: number,
    @Body() dto: UpdateChunkStatusDto,
  ) {
    return this.bills.setChunkStatus(user.id, ref, index, dto.status);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':ref/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('ref') ref: string) {
    return this.bills.cancel(user.id, ref);
  }
}