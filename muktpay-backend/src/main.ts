import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const port = Number(process.env.PORT ?? 4000);
  // 0.0.0.0 so a phone on the same Wi-Fi (Expo Go) can reach the API.
  await app.listen(port, '0.0.0.0');
  Logger.log(`MuktPay API running on http://localhost:${port}/api`, 'Bootstrap');
}
bootstrap();
