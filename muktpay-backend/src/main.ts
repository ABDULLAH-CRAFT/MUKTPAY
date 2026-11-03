import { Logger, LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { resolveHost, resolvePort } from './config/runtime.config';

// Production keeps the logs useful: no debug/verbose noise.
const LOG_LEVELS: LogLevel[] =
  process.env.NODE_ENV === 'production' ? ['log', 'warn', 'error', 'fatal'] : ['log', 'warn', 'error', 'debug', 'verbose'];

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: LOG_LEVELS });
  configureApp(app);
  app.enableShutdownHooks(); // finish in-flight requests and close the DB pool on SIGTERM

  const port = resolvePort(process.env.PORT);
  // HOST defaults to 0.0.0.0 so a phone on the same Wi-Fi (Expo Go) and Docker can reach the API.
  // Set HOST=127.0.0.1 when a reverse proxy on the same machine is the only thing that should.
  const host = resolveHost(process.env.HOST);
  await app.listen(port, host);
  Logger.log(`MuktPay API listening on http://${host}:${port}/api (${process.env.NODE_ENV})`, 'Bootstrap');
}

bootstrap().catch((error: unknown) => {
  Logger.error(error instanceof Error ? error.message : String(error), undefined, 'Bootstrap');
  process.exit(1);
});
