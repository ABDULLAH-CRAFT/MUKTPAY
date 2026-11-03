import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from './auth.types';
import { AccountService } from './account.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { DeleteAccountDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto } from './dto/account.dto';

// Same brute-force limit as login: 5 attempts / minute / IP.
const STRICT = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AccountController {
  constructor(private readonly account: AccountService) {}

  /** Public. Always answers the same way, whether or not the email has an account. */
  @Public()
  @Throttle(STRICT)
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.account.requestPasswordReset(dto.email);
    return { message: 'If an account exists for that email, we have sent a 6-digit code.' };
  }

  @Public()
  @Throttle(STRICT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.account.resetPassword(dto.email, dto.code, dto.newPassword);
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('send-verification')
  async sendVerification(@CurrentUser() user: AuthUser) {
    await this.account.sendVerification(user.id);
  }

  @Throttle(STRICT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('verify-email')
  async verifyEmail(@CurrentUser() user: AuthUser, @Body() dto: VerifyEmailDto) {
    await this.account.verifyEmail(user.id, dto.code);
  }

  /** Permanent. Needs the password again so a stolen, still-logged-in phone can't wipe the account. */
  @Throttle(STRICT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('delete-account')
  async deleteAccount(@CurrentUser() user: AuthUser, @Body() dto: DeleteAccountDto) {
    await this.account.deleteAccount(user.id, dto.password);
  }
}
