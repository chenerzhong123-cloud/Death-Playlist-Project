import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SongsModule } from './songs/songs.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { ShareModule } from './share/share.module';
import { SeedModule } from './seed/seed.module';
import * as express from 'express';
import { join } from 'path';
import { existsSync } from 'fs';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DB_DATABASE || 'death_playlist.db',
      autoLoadEntities: true,
      synchronize: true,
    }),
    AuthModule,
    UsersModule,
    SongsModule,
    PlaylistsModule,
    ShareModule,
    SeedModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    const staticPath = join(__dirname, '..', 'static');
    if (existsSync(staticPath)) {
      console.log('📂 Serving frontend from:', staticPath);
      consumer
        .apply(express.static(staticPath))
        .forRoutes({ path: '*', method: RequestMethod.ALL });
    } else {
      console.log('⚠️ No static/ directory found at', staticPath);
    }
  }
}
