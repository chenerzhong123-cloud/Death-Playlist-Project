import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  const port = process.env.PORT || 80;
  await app.listen(port, '0.0.0.0');
  console.log(`🪦 Death Playlist Backend running on http://localhost:${port}/api`);
}
bootstrap();
