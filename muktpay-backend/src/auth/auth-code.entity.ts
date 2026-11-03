import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';

export type AuthCodePurpose = 'email_verification' | 'password_reset';

/**
 * A short-lived 6-digit code sent by email. We keep only an HMAC of it, so a database leak does
 * not hand out working codes. A code can be tried a few times, then it is dead.
 */
@Entity('auth_codes')
@Index('idx_auth_codes_user_purpose', ['userId', 'purpose'])
export class AuthCode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 30 })
  purpose!: AuthCodePurpose;

  @Column({ type: 'char', length: 64 })
  codeHash!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  consumedAt!: Date | null;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
