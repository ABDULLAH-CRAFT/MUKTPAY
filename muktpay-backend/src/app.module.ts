import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { typeOrmConfig } from './config/database.config';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: typeOrmConfig }),
    // Default limit for every route; credential endpoints tighten it in AuthController.
    // Skipped under Jest (NODE_ENV=test) so e2e tests aren't rate limited.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100, skipIf: () => process.env.NODE_ENV === 'test' }]),
    UsersModule,
    AuthModule,
    HealthModule,
    // Phase 6: SplitModule
    // Phase 8: OrdersModule, PaymentsModule
    // Phase 9: GroupsModule
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
