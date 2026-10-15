import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { join } from 'path';

export function configureApp(app: NestExpressApplication) {
  const staticPath = join(__dirname, '..', 'static');
  // Support both direct subpath hosting and nginx stripping /deathplaylist/.
  app.use('/deathplaylist', express.static(staticPath));
  app.use(express.static(staticPath));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const origins = process.env.CORS_ORIGINS?.split(',').map(origin => origin.trim()) ||
    ['http://localhost:3000', 'http://localhost:5173', 'https://www.deuce.monster'];
  app.enableCors({ origin: origins, credentials: true });
}
