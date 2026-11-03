import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { AuthCodeService } from './auth-code.service';
import { AuthService, BCRYPT_COST } from './auth.service';

const INVALID_CODE = 'That code is invalid or has expired.';

/** Email verification, password reset and account deletion. */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly users: UsersService,
    private readonly codes: AuthCodeService,
    private readonly mail: MailService,
    private readonly auth: AuthService,
  ) {}

  // ---- email verification ------------------------------------------------------------------

  /** Emails a verification code. Does nothing if the email is already verified. */
  async sendVerification(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user || !user.isActive || user.emailVerifiedAt) return;

    const code = await this.codes.issue(user.id, 'email_verification');
    if (!code) {
      throw new HttpException('Please wait a minute before asking for another code.', HttpStatus.TOO_MANY_REQUESTS);
    }
    await this.mail.sendVerificationCode(user.email, user.name, code, this.codes.ttlMinutes('email_verification'));
  }

  async verifyEmail(userId: string, code: string): Promise<void> {
    if (!(await this.codes.verify(userId, 'email_verification', code))) throw new BadRequestException(INVALID_CODE);
    await this.users.markEmailVerified(userId);
  }

  // ---- password reset ------------------------------------------------------------------------

  /**
   * Always looks the same from outside, whether or not the email has an account, so this
   * endpoint can't be used to find out who is registered.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user || !user.isActive) return;

    const code = await this.codes.issue(user.id, 'password_reset');
    if (!code) return; // asked less than a minute ago: stay silent

    // Not awaited: the response must not depend on how long the mail server takes.
    void this.mail
      .sendPasswordResetCode(user.email, user.name, code, this.codes.ttlMinutes('password_reset'))
      .catch((error: unknown) => {
        this.logger.error(`Password reset email failed: ${error instanceof Error ? error.message : String(error)}`);
      });
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user || !user.isActive) throw new BadRequestException(INVALID_CODE);
    if (!(await this.codes.verify(user.id, 'password_reset', code))) throw new BadRequestException(INVALID_CODE);

    await this.users.updatePassword(user.id, await bcrypt.hash(newPassword, BCRYPT_COST));
    await this.users.markEmailVerified(user.id); // they just proved they own this mailbox
    await this.auth.logoutAll(user.id); // everyone who had the old password is signed out
  }

  // ---- account deletion ----------------------------------------------------------------------

  /**
   * Permanently deletes the account. The database removes everything that belongs to it in the
   * same statement (shop profile, bills, payments, sign-in sessions, codes). See the foreign
   * keys with ON DELETE CASCADE in the migrations.
   */
  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await this.users.findByIdWithPassword(userId);
    if (!user || !user.isActive) throw new NotFoundException('User not found');

    // 403, not 401: a 401 would make the app try to refresh the session and retry.
    if (!(await bcrypt.compare(password, user.passwordHash))) throw new ForbiddenException('Incorrect password.');

    await this.users.deleteById(userId);
    this.logger.log(`Account deleted (user ${userId})`);
  }
}
