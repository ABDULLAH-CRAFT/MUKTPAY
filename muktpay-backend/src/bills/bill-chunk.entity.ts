import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Bill } from './bill.entity';

export type ChunkStatus = 'pending' | 'paid';

/**
 * One QR code / one UPI payment within a bill. `index` is the 1-based position the customer
 * pays them in — it matches the "N/M" printed into this chunk's `upiUrl` note field, which is
 * what lets the same shared `ref` on every chunk read as "part N of M of one order" rather than
 * M unrelated payments (see Bill's doc comment on why that distinction matters).
 */
@Entity('bill_chunks')
@Index('uq_bill_chunks_bill_id_index', ['billId', 'index'], { unique: true })
export class BillChunk {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  billId!: string;

  @ManyToOne(() => Bill, (bill) => bill.chunks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bill_id' })
  bill!: Bill;

  @Column({ type: 'integer' })
  index!: number;

  @Column({ type: 'integer' })
  amountPaise!: number;

  @Column({ type: 'varchar', length: 10, default: 'pending' })
  status!: ChunkStatus;

  /** The exact `upi://pay?…` string encoded into this chunk's QR code. */
  @Column({ type: 'text' })
  upiUrl!: string;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
