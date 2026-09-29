import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { BillChunk } from './bill-chunk.entity';
import type { SplitStrategy } from '../split/interfaces/split.interfaces';

/**
 * open      : being collected.
 * settled   : every chunk marked paid.
 * cancelled : the merchant called it off (only possible while nothing is marked paid). Terminal.
 * expired   : sat open for BILL_EXPIRY_HOURS with nothing paid. Recording a late payment reopens it.
 */
export type BillStatus = 'open' | 'settled' | 'cancelled' | 'expired';

/**
 * One bill a merchant is collecting, split into one or more UPI payments (chunks) because a
 * single transaction would exceed the customer's per-transaction cap. `ref` is the shared
 * reference printed into every chunk's note — see BillChunk for why that matters.
 *
 * shopName/vpa are a SNAPSHOT of the merchant profile at creation time: editing the profile
 * later must never silently change the amount or payee on a bill already shown to a customer.
 */
@Index('uq_bills_merchant_idempotency_key', ['merchantId', 'idempotencyKey'], { unique: true })
@Entity('bills')
export class Bill {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_bills_merchant_id')
  @Column({ type: 'uuid' })
  merchantId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'merchant_id' })
  merchant!: User;

  /** Short, human-readable reference e.g. "MP7X2K9A". Unique across all bills. */
  @Index('uq_bills_ref', { unique: true })
  @Column({ type: 'varchar', length: 12 })
  ref!: string;

  @Column({ type: 'varchar', length: 50 })
  shopName!: string;

  @Column({ type: 'varchar', length: 100 })
  vpa!: string;

  @Column({ type: 'integer' })
  totalPaise!: number;

  /** The per-transaction cap this bill was split under. */
  @Column({ type: 'integer' })
  capPaise!: number;

  @Column({ type: 'varchar', length: 20 })
  strategy!: SplitStrategy;

  /** Denormalised for fast history filtering; kept in sync as chunks change. */
  @Column({ type: 'varchar', length: 20, default: 'open' })
  status!: BillStatus;

  /** After this moment an open bill with nothing paid is marked expired (lazily, on read). */
  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;
    /** Optional free-text label, e.g. "Ramesh, order 12" — makes a bill findable by more than its ref. */
  @Column({ type: 'varchar', length: 60, nullable: true })
  note!: string | null;
    /**
   * Client-chosen key that makes creating this bill safe to retry. Unique per merchant; bills made
   * without one leave it null (Postgres treats nulls as distinct, so those never collide).
   * `select: false` keeps it out of API responses: it's plumbing, not part of the bill.
   */
  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  idempotencyKey!: string | null;

  @OneToMany(() => BillChunk, (chunk) => chunk.bill)
  chunks!: BillChunk[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}