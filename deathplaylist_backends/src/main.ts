import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Health/debug endpoint at root — helps diagnose callContainer path issues
  app.use('/health', (req: any, res: any) => {
    res.json({ status: 'ok', path: req.path, url: req.url, method: req.method });
  });

  // Log all incoming requests to diagnose callContainer path mapping
  app.use((req: any, res: any, next: any) => {
    console.log(`[REQ] ${req.method} ${req.url} path=${req.path}`);
    next();
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Ensure JSON body parsing works for all routes
  app.use(json());
  app.use(urlencoded({ extended: true }));

  const origins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:5173', 'https://dist-three-henna-12.vercel.app'];
  app.enableCors({ origin: origins, credentials: true });

  const port = process.env.PORT || 80;
  await app.listen(port, '0.0.0.0');
  console.log(`🪦 Death Playlist Backend running on http://localhost:${port}/api`);
}
bootstrap();
