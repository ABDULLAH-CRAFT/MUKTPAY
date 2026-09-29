import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';

/**
 * The merchant's own shop details — one row per merchant account.
 *
 * Previously this lived only in Expo SecureStore, per device. Now the server is the source of
 * truth: the shop follows the merchant to any device they log into, and every bill built from
 * it can be traced back to an account instead of living only on the phone that made it.
 */
@Entity('merchant_profiles')
export class MerchantProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('uq_merchant_profiles_user_id', { unique: true })
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /** Shown to the customer inside their UPI app (the `pn` field of every QR this shop issues). */
  @Column({ type: 'varchar', length: 50 })
  shopName!: string;

  /** Lowercase UPI ID, e.g. "guptakirana@okhdfcbank". */
  @Column({ type: 'varchar', length: 100 })
  vpa!: string;

  /**
   * How far we've actually checked the UPI ID. 'format' is all that's possible without a
   * payment aggregator (see the Bill entity's Phase 6 note). Never presented to the user as
   * "verified" — the mobile form is explicit about this in its own copy.
   */
  @Column({ type: 'varchar', length: 20, default: 'format' })
  verification!: 'format' | 'penny' | 'provider';

  /** Client-computed label from the handle, e.g. "Google Pay · HDFC Bank". Null when unrecognised. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  issuerLabel!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
