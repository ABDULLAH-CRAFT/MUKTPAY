import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Bill } from './bill.entity';

export type BillEventType =
  | 'bill_created'
  | 'chunk_marked_paid'
  | 'chunk_marked_pending'
  | 'bill_settled'
  | 'bill_reopened'
  | 'bill_cancelled'
  | 'bill_expired';

/**
 * An append-only record of what happened to a bill and when. "Mark as paid" is only the
 * merchant's word (a plain UPI QR sends no callback), so a trustworthy record of exactly who
 * said what, and when, matters. Rows are only ever inserted, never edited.
 */
@Entity('bill_events')
@Index('idx_bill_events_bill_id_created_at', ['billId', 'createdAt'])
export class BillEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  billId!: string;

  @ManyToOne(() => Bill, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bill_id' })
  bill!: Bill;

  /** The user who did it. Null for system events (expiry). */
  @Column({ type: 'uuid', nullable: true })
  actorId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor!: User | null;

  @Column({ type: 'varchar', length: 30 })
  type!: BillEventType;

  /** Which payment, for chunk events. */
  @Column({ type: 'integer', nullable: true })
  chunkIndex!: number | null;

  /** The amount involved: the chunk's amount, or the bill total for bill_created. */
  @Column({ type: 'integer', nullable: true })
  amountPaise!: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}