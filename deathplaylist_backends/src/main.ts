import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const origins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:5173', 'http://47.103.81.95', 'https://servicewechat.com'];
  app.enableCors({ origin: origins, credentials: true });

  const port = process.env.PORT || 80;
  await app.listen(port, '0.0.0.0');
  console.log(`🪦 Death Playlist Backend running on http://localhost:${port}/api`);
}
bootstrap();
