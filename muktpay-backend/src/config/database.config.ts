import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from '../common/naming/snake-naming.strategy';

/**
 * The schema is changed ONLY through migrations (src/migrations), never by `synchronize`.
 * synchronize can silently drop columns; on a payments database that is unacceptable.
 * Pending migrations are applied automatically at boot (set DB_MIGRATIONS_RUN=false to disable).
 */
export const typeOrmConfig = (config: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.get<string>('DB_HOST', 'localhost'),
  port: Number(config.get('DB_PORT', 5432)),
  username: config.get<string>('DB_USER'),
  password: config.get<string>('DB_PASSWORD'),
  database: config.get<string>('DB_NAME'),
  autoLoadEntities: true, // entities register via TypeOrmModule.forFeature()
  synchronize: false,
  namingStrategy: new SnakeNamingStrategy(),
  // uuid defaults use gen_random_uuid() (built into PostgreSQL 13+), no uuid-ossp needed.
  uuidExtension: 'pgcrypto',
  // Compiled .js only: `nest start` / `node dist/main` run from /dist.
  migrations: [join(__dirname, '..', 'migrations', '*.js')],
  migrationsRun: config.get('DB_MIGRATIONS_RUN') !== 'false',
});
