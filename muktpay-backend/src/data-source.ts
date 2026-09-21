import 'dotenv/config';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from './common/naming/snake-naming.strategy';

/** Used only by the TypeORM CLI (npm run migration:*). The app itself uses config/database.config.ts. */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  namingStrategy: new SnakeNamingStrategy(),
  // uuid defaults use gen_random_uuid() (built into PostgreSQL 13+), no uuid-ossp needed.
  uuidExtension: 'pgcrypto',
  entities: [join(__dirname, '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
});
