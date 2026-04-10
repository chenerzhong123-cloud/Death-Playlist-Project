import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 静态文件必须在 setGlobalPrefix 之前注册，否则 / 会被 API 路由拦截
  app.use(express.static(join(__dirname, '..', 'static')));

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
