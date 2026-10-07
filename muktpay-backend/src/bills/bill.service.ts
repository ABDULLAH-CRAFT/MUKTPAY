import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { MerchantService } from '../merchant/merchant.service';
import { SplitService } from '../split/split.service';
import { BillChunk, type ChunkStatus } from './bill-chunk.entity';
import { BillEvent, type BillEventType } from './bill-event.entity';
import { Bill, type BillStatus } from './bill.entity';
import { CreateBillDto } from './dto/create-bill.dto';
import { ListBillsQueryDto } from './dto/list-bills-query.dto';
import { buildMerchantUpiUrl, chunkNote, makeBillRef } from './upi.util';

/** How long an untouched bill stays "open" before it is marked expired. */
export const BILL_EXPIRY_HOURS = 24;

/** Shape of an accepted Idempotency-Key: 8-64 characters, so a UUID (with dashes) fits. */
const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,64}$/;
const IDEMPOTENCY_INDEX = 'uq_bills_merchant_idempotency_key';

interface EventSpec {
  type: BillEventType;
  chunkIndex?: number;
  amountPaise?: number;
}

interface ExpectedBill {
  totalPaise: number;
  capPaise: number;
  strategy: Bill['strategy'];
  note: string | null;
}

export interface BillsSummary {
  from: string;
  to: string;
  /** Bills created in the window (any status). */
  billsCreated: number;
  settledCount: number;
  cancelledCount: number;
  /** Sum of totalPaise for non-cancelled bills created in the window. */
  invoicedPaise: number;
  /** Sum of payments actually marked paid IN the window — by when they were paid, not when the
   *  bill was created. A bill made yesterday and paid today counts toward today's collections. */
  collectedPaise: number;
  billsWithPayment: number;
}

@Injectable()
export class BillService {
  constructor(
    @InjectRepository(Bill) private readonly bills: Repository<Bill>,
    @InjectRepository(BillEvent) private readonly billEvents: Repository<BillEvent>,
    private readonly dataSource: DataSource,
    private readonly merchant: MerchantService,
    private readonly split: SplitService,
  ) {}

  /**
   * With an idempotency key, creating a bill is safe to retry: the same key from the same
   * merchant always gives back the same bill instead of making another. Without one, every call
   * makes a new bill, exactly as before.
   */
  async create(merchantId: string, dto: CreateBillDto, idempotencyKey?: string): Promise<Bill> {
    if (idempotencyKey !== undefined && !IDEMPOTENCY_KEY.test(idempotencyKey)) {
      throw new BadRequestException('Idempotency-Key must be 8-64 characters: letters, numbers, - or _.');
    }

    // Same engine + same rules /split/preview uses, so a bill can never disagree with the plan
    // the merchant already saw on screen before tapping "Generate QR codes".
    const rules = this.split.rulesFor({ maxTranchePaise: dto.capPaise, strategy: dto.strategy });
    const plan = this.split.plan(dto.totalPaise, rules);
    const note = dto.note?.trim() || null;
    const expected: ExpectedBill = {
      totalPaise: plan.totalPaise,
      capPaise: rules.maxTranchePaise,
      strategy: plan.strategy,
      note,
    };

    // A retry of something that already succeeded: hand back the original. This comes before the
    // profile check on purpose, so a replay still works even if the shop details changed since.
    if (idempotencyKey) {
      const replay = await this.findReplay(merchantId, idempotencyKey, expected);
      if (replay) return replay;
    }

    const profile = await this.merchant.getOrThrow(merchantId);
    const ref = await this.uniqueRef();

    try {
      // One transaction: a bill never exists without its payments and its "created" event.
      return await this.dataSource.transaction(async (manager) => {
        const bill = await manager.save(
          manager.create(Bill, {
            merchantId,
            ref,
            shopName: profile.shopName,
            vpa: profile.vpa,
            totalPaise: plan.totalPaise,
            capPaise: rules.maxTranchePaise,
            strategy: plan.strategy,
            status: 'open',
            expiresAt: new Date(Date.now() + BILL_EXPIRY_HOURS * 3_600_000),
            cancelledAt: null,
            note,
            idempotencyKey: idempotencyKey ?? null,
          }),
        );

        bill.chunks = await manager.save(
          plan.tranches.map((tranche) =>
            manager.create(BillChunk, {
              billId: bill.id,
              index: tranche.index,
              amountPaise: tranche.amountPaise,
              status: 'pending',
              upiUrl: buildMerchantUpiUrl({
                vpa: profile.vpa,
                shopName: profile.shopName,
                amountPaise: tranche.amountPaise,
                note: chunkNote(ref, tranche.index, plan.trancheCount),
              }),
            }),
          ),
        );

        await this.record(manager, bill.id, merchantId, [{ type: 'bill_created', amountPaise: bill.totalPaise }]);
        return bill;
      });
    } catch (error) {
      // Two requests with the same key arrived at the same moment. The database's unique index let
      // exactly one through; the loser lands here and returns the winner's bill.
      if (idempotencyKey && this.isIdempotencyConflict(error)) {
        const replay = await this.findReplay(merchantId, idempotencyKey, expected);
        if (replay) return replay;
      }
      throw error;
    }
  }

  async list(merchantId: string, query: ListBillsQueryDto): Promise<{ items: Bill[]; nextCursor: string | null }> {
    await this.expireStale(merchantId);
    const limit = query.limit ?? 20;

    const qb = this.bills
      .createQueryBuilder('bill')
      .leftJoinAndSelect('bill.chunks', 'chunk')
      .where('bill.merchant_id = :merchantId', { merchantId });

    if (query.status) qb.andWhere('bill.status = :status', { status: query.status });
    if (query.from) qb.andWhere('bill.created_at >= :from', { from: query.from });
    if (query.to) qb.andWhere('bill.created_at < :to', { to: query.to });
    if (query.search) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere('(bill.ref ILIKE :term OR bill.note ILIKE :term)', { term });
    }

    // Fetch one extra row: if it exists there's another page, and we don't return it.
    const rows = await qb
      .orderBy('bill.createdAt', 'DESC')
      .addOrderBy('bill.id', 'DESC')
      .take(limit + 1)
      .getMany();

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    for (const bill of items) bill.chunks.sort((a, b) => a.index - b.index);

    return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  /**
   * Two numbers for a date range: what was invoiced (bills CREATED in the window) and what was
   * actually collected (payments marked paid IN the window — by paid_at, not by the bill's own
   * created_at, since a bill can be paid on a different day than it was made).
   */
  async summary(merchantId: string, from: string, to: string): Promise<BillsSummary> {
    const [created] = await this.dataSource.query(
      `SELECT
         COUNT(*)::int AS bills_created,
         COUNT(*) FILTER (WHERE status = 'settled')::int AS settled_count,
         COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_count,
         COALESCE(SUM(total_paise) FILTER (WHERE status != 'cancelled'), 0)::bigint AS invoiced_paise
       FROM bills
       WHERE merchant_id = $1 AND created_at >= $2 AND created_at < $3`,
      [merchantId, from, to],
    );

    const [collected] = await this.dataSource.query(
      `SELECT
         COALESCE(SUM(bc.amount_paise), 0)::bigint AS collected_paise,
         COUNT(DISTINCT bc.bill_id)::int AS bills_with_payment
       FROM bill_chunks bc
       JOIN bills b ON b.id = bc.bill_id
       WHERE b.merchant_id = $1 AND bc.status = 'paid' AND bc.paid_at >= $2 AND bc.paid_at < $3`,
      [merchantId, from, to],
    );

    return {
      from,
      to,
      billsCreated: created.bills_created,
      settledCount: created.settled_count,
      cancelledCount: created.cancelled_count,
      invoicedPaise: Number(created.invoiced_paise),
      collectedPaise: Number(collected.collected_paise),
      billsWithPayment: collected.bills_with_payment,
    };
  }

  async findOwnedByRef(merchantId: string, ref: string): Promise<Bill> {
    await this.expireStale(merchantId);
    const bill = await this.bills.findOne({
      where: { ref: ref.toUpperCase() },
      relations: { chunks: true },
      order: { chunks: { index: 'ASC' } },
    });
    if (!bill) throw new NotFoundException('Bill not found');
    // 404, not 403: existence of another merchant's ref shouldn't be distinguishable from absence.
    if (bill.merchantId !== merchantId) throw new NotFoundException('Bill not found');
    return bill;
  }

  /** The bill's history, newest first. */
  async events(merchantId: string, ref: string): Promise<BillEvent[]> {
    const bill = await this.findOwnedByRef(merchantId, ref);
    return this.billEvents.find({ where: { billId: bill.id }, order: { createdAt: 'DESC' }, take: 100 });
  }

  async setChunkStatus(merchantId: string, ref: string, index: number, status: ChunkStatus): Promise<Bill> {
    const bill = await this.findOwnedByRef(merchantId, ref);
    if (bill.status === 'cancelled') throw new ConflictException('This bill was cancelled.');

    const chunk = bill.chunks.find((c) => c.index === index);
    if (!chunk) throw new NotFoundException('Payment not found on this bill');

    // Already in that state: nothing changed, so nothing is written or recorded. This also stops
    // a double-tap from overwriting the original paid_at timestamp.
    if (chunk.status === status) return bill;

    const settled = bill.chunks.every((c) => (c.index === index ? status === 'paid' : c.status === 'paid'));
    const nextStatus: BillStatus = settled ? 'settled' : 'open';

    await this.dataSource.transaction(async (manager) => {
      await manager.update(BillChunk, chunk.id, { status, paidAt: status === 'paid' ? new Date() : null });

      const events: EventSpec[] = [
        {
          type: status === 'paid' ? 'chunk_marked_paid' : 'chunk_marked_pending',
          chunkIndex: index,
          amountPaise: chunk.amountPaise,
        },
      ];
      if (bill.status !== nextStatus) {
        await manager.update(Bill, bill.id, { status: nextStatus });
        events.push({ type: settled ? 'bill_settled' : 'bill_reopened' });
      }
      await this.record(manager, bill.id, merchantId, events);
    });

    return this.findOwnedByRef(merchantId, ref);
  }

  /**
   * Calls a bill off. Only allowed while nothing is marked as received: cancelling must never be
   * a way to make money that already arrived disappear from the record. Idempotent.
   */
  async cancel(merchantId: string, ref: string): Promise<Bill> {
    const bill = await this.findOwnedByRef(merchantId, ref);
    if (bill.status === 'cancelled') return bill;
      throw new ConflictException('Some payments are already marked as paid. Undo them first, or leave the bill open.');
    if (bill.chunks.some((c) => c.status === 'paid')) {
      throw new ConflictException('Some payments are already marked as received. Undo them first, or leave the bill open.');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Bill, bill.id, { status: 'cancelled', cancelledAt: new Date() });
      await this.record(manager, bill.id, merchantId, [{ type: 'bill_cancelled' }]);
    });

    return this.findOwnedByRef(merchantId, ref);
  }

  /**
   * The bill this merchant already made under this key, or null. If the key was used for a
   * DIFFERENT bill (other amount, cap, split or note), that's a client bug and is refused rather
   * than silently returning a bill that doesn't match what was asked for.
   */
  private async findReplay(merchantId: string, key: string, expected: ExpectedBill): Promise<Bill | null> {
    const existing = await this.bills.findOne({
      where: { merchantId, idempotencyKey: key },
      relations: { chunks: true },
      order: { chunks: { index: 'ASC' } },
    });
    if (!existing) return null;

    if (
      existing.totalPaise !== expected.totalPaise ||
      existing.capPaise !== expected.capPaise ||
      existing.strategy !== expected.strategy ||
      existing.note !== expected.note
    ) {
      throw new ConflictException('This Idempotency-Key was already used for a different bill.');
    }
    return existing;
  }

  private isIdempotencyConflict(error: unknown): boolean {
    const e = error as { code?: string; constraint?: string; driverError?: { constraint?: string } };
    return e?.code === '23505' && (e.driverError?.constraint ?? e.constraint) === IDEMPOTENCY_INDEX;
  }

  /** Appends events for one bill. Events from a single transaction would all share Postgres'
   *  now(), so they're staggered by a millisecond each to keep their order when read back. */
  private async record(manager: EntityManager, billId: string, actorId: string | null, events: EventSpec[]): Promise<void> {
    const base = Date.now();
    await manager.save(
      events.map((event, i) =>
        manager.create(BillEvent, {
          billId,
          actorId,
          type: event.type,
          chunkIndex: event.chunkIndex ?? null,
          amountPaise: event.amountPaise ?? null,
          createdAt: new Date(base + i),
        }),
      ),
    );
  }

  /**
   * Lazy expiry: instead of a cron job, stale bills are flipped whenever the merchant reads their
   * bills. Only bills with NOTHING paid expire — a partly paid bill still has money owed on it.
   * One statement flips the bills AND logs a system event (no actor) for each, so the two can't
   * disagree.
   */
  private async expireStale(merchantId: string): Promise<void> {
    await this.dataSource.query(
      `WITH expired AS (
         UPDATE bills SET status = 'expired', updated_at = now()
         WHERE merchant_id = $1 AND status = 'open' AND expires_at < now()
           AND NOT EXISTS (SELECT 1 FROM bill_chunks c WHERE c.bill_id = bills.id AND c.status = 'paid')
         RETURNING id
       )
       INSERT INTO bill_events (bill_id, actor_id, type)
       SELECT id, NULL, 'bill_expired' FROM expired`,
      [merchantId],
    );
  }

  /** Collisions are astronomically unlikely (6-char timestamp + 2 random chars) but never assumed. */
  private async uniqueRef(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const ref = makeBillRef();
      const count = await this.bills.count({ where: { ref } });
      if (count === 0) return ref;
    }
    throw new BadRequestException('Could not generate a bill reference, please try again.');
  }
}