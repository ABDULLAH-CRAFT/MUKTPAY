import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  async check() {
    let database: 'up' | 'down' = 'down';
    try {
      await this.dataSource.query('SELECT 1');
      database = 'up';
    } catch {
      // reported as "down" below
    }
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      service: 'muktpay-backend',
      database,
      time: new Date().toISOString(),
    };
  }
}
