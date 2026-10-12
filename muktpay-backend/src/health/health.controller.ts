import { Controller, Get, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators/public.decorator';

const SERVICE = 'muktpay-backend';
/** A hung database must not hang the probe: after this it counts as down. */
const DB_CHECK_TIMEOUT_MS = 2_000;

// Probes hit these every few seconds from one address: never rate limit them.
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Liveness: answers 200 as long as the process itself is running, so an orchestrator doesn't
   * restart a perfectly good process just because the database is briefly down.
   * status "degraded" tells a human (or the app) that the database is unreachable.
   */
  @Public()
  @Get()
  async live() {
    const database = (await this.databaseIsUp()) ? 'up' : 'down';
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      service: SERVICE,
      database,
      uptimeSeconds: Math.round(process.uptime()),
      time: new Date().toISOString(),
    };
  }

  /**
   * Readiness: 200 only when this instance can really serve requests. A database outage returns
   * 503 so a load balancer stops sending traffic here until it recovers.
   */
  @Public()
  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response) {
    const up = await this.databaseIsUp();
    if (!up) res.status(503);
    return {
      status: up ? 'ok' : 'unhealthy',
      service: SERVICE,
      database: up ? 'up' : 'down',
      time: new Date().toISOString(),
    };
  }

  private async databaseIsUp(): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.dataSource.query('SELECT 1'),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('database check timed out')), DB_CHECK_TIMEOUT_MS);
        }),
      ]);
      return true;
    } catch {
      return false; // never leak the reason to an unauthenticated caller
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}