import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from '../users/user.entity';

/**
 * One row per issued refresh token (one per logged-in device/session).
 * We store only a SHA-256 hash, so a database leak does not hand out working sessions.
 * Tokens are never deleted on use: they are marked revoked, which lets us detect
 * a stolen token being replayed after the real user already rotated it.
 */
@Entity('refresh_tokens')
export class RefreshToken {
  /** Equals the `jti` claim inside the JWT. Assigned in code, not generated. */
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Index('idx_refresh_tokens_user_id')
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'char', length: 64 })
  tokenHash!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
