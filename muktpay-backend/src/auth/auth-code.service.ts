import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { AuthCode, type AuthCodePurpose } from './auth-code.entity';

const TTL_MINUTES: Record<AuthCodePurpose, number> = {
  email_verification: 30,
  password_reset: 15,
};
/** After this many wrong guesses a code is dead (a 6-digit code has only a million possibilities). */
const MAX_ATTEMPTS = 5;
/** One new code per minute per account and purpose. */
const RESEND_COOLDOWN_MS = 60_000;

@Injectable()
export class AuthCodeService {
  constructor(
    @InjectRepository(AuthCode) private readonly codes: Repository<AuthCode>,
    private readonly config: ConfigService,
  ) {}

  ttlMinutes(purpose: AuthCodePurpose): number {
    return TTL_MINUTES[purpose];
  }

  /**
   * Creates a fresh code (and kills any older unused one). Returns the plain code to email,
   * or null when a code was already issued less than a minute ago.
   */
  async issue(userId: string, purpose: AuthCodePurpose): Promise<string | null> {
    const latest = await this.codes.findOne({ where: { userId, purpose }, order: { createdAt: 'DESC' } });
    if (latest && Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) return null;

    await this.codes.update({ userId, purpose, consumedAt: IsNull() }, { consumedAt: new Date() });

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.codes.insert({
      userId,
      purpose,
      codeHash: this.hash(userId, purpose, code),
      expiresAt: new Date(Date.now() + TTL_MINUTES[purpose] * 60_000),
    });
    return code;
  }

  /** True only for the right, unexpired, unused code that has not run out of attempts. One use only. */
  async verify(userId: string, purpose: AuthCodePurpose, code: string): Promise<boolean> {
    const active = await this.codes.findOne({
      where: { userId, purpose, consumedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      order: { createdAt: 'DESC' },
    });
    if (!active) return false;

    // Count the attempt BEFORE checking it, atomically, so parallel guesses can't beat the limit.
    const counted = await this.codes
      .createQueryBuilder()
      .update(AuthCode)
      .set({ attempts: () => 'attempts + 1' })
      .where('id = :id AND attempts < :max', { id: active.id, max: MAX_ATTEMPTS })
      .returning('id')
      .execute();
    if (!Array.isArray(counted.raw) || counted.raw.length === 0) return false;

    const expected = Buffer.from(active.codeHash, 'hex');
    const given = Buffer.from(this.hash(userId, purpose, code), 'hex');
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;

    // Atomic "claim": only one request can consume the code.
    const claimed = await this.codes.update({ id: active.id, consumedAt: IsNull() }, { consumedAt: new Date() });
    return claimed.affected === 1;
  }

  private hash(userId: string, purpose: AuthCodePurpose, code: string): string {
    const key = `${this.config.getOrThrow<string>('JWT_ACCESS_SECRET')}:auth-code`;
    return createHmac('sha256', key).update(`${purpose}:${userId}:${code}`).digest('hex');
  }
}
