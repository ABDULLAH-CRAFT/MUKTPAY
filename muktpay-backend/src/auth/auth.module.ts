import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { AuthCode } from './auth-code.entity';
import { AuthCodeService } from './auth-code.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshToken } from './refresh-token.entity';

@Module({
  imports: [
    UsersModule,
    MailModule,
    TypeOrmModule.forFeature([RefreshToken, AuthCode]),
    // Secrets are passed per call because access and refresh tokens use different ones.
    JwtModule.register({}),
  ],
  controllers: [AuthController, AccountController],
  providers: [
    AuthService,
    AuthCodeService,
    AccountService,
    // Secure by default: every route needs a valid access token unless marked @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
