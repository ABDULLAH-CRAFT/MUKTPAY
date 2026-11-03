import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { requestLogger } from './common/middleware/request-logger.middleware';
import { parseCorsOrigins, parseTrustProxy } from './config/runtime.config';

/** Shared by main.ts and the e2e tests so tests exercise the same pipeline as production. */
export function configureApp(app: INestApplication) {
  // Behind a reverse proxy every request arrives from the proxy's address. Telling Express how
  // many proxies to trust makes `req.ip` the real client, which the rate limiter (per-IP) and the
  // IP stored with each login session both rely on. See TRUST_PROXY in .env.example.
  const express = app.getHttpAdapter().getInstance() as { set: (name: string, value: unknown) => void };
  express.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));

  // Access log (one line per request). Skipped under Jest so test output stays readable.
  if (process.env.NODE_ENV !== 'test') app.use(requestLogger);

  app.use(helmet());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({
    origin: parseCorsOrigins(process.env.CORS_ORIGINS),
    credentials: true,
  });
}
