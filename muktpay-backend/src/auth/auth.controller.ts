import { Body, Controller, HttpCode, HttpStatus, Logger, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AccountService } from './account.service';
import type { AuthUser, RequestMeta } from './auth.types';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

const metaFrom = (req: Request): RequestMeta => ({
  userAgent: req.headers['user-agent']?.slice(0, 255) ?? null,
  ipAddress: req.ip?.slice(0, 64) ?? null,
});

// Brute-force protection: 5 attempts / minute / IP on credential endpoints.
const STRICT = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly auth: AuthService,
    private readonly account: AccountService,
  ) {}

  @Public()
  @Throttle(STRICT)
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const result = await this.auth.register(dto, metaFrom(req));

    // Best effort and not awaited: the account exists either way, and the person can ask for
    // another code from the Account screen.
    void this.account.sendVerification(result.user.id).catch((error: unknown) => {
      this.logger.warn(`Verification email failed: ${error instanceof Error ? error.message : String(error)}`);
    });

    return result;
  }

  @Public()
  @Throttle(STRICT)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, metaFrom(req));
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.auth.refresh(dto.refreshToken, metaFrom(req));
  }

  /** Public on purpose: the access token may already be expired when the user taps "Log out". */
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Body() dto: RefreshDto) {
    await this.auth.logout(dto.refreshToken);
  }

  /** "Log out of all devices". */
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout-all')
  async logoutAll(@CurrentUser() user: AuthUser) {
    await this.auth.logoutAll(user.id);
  }
}
