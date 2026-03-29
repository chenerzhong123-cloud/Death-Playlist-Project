import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SongsModule } from './songs/songs.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { FriendsModule } from './friends/friends.module';
import { ShareModule } from './share/share.module';
import { SeedModule } from './seed/seed.module';

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
    FriendsModule,
    ShareModule,
    SeedModule,
  ],
})
export class AppModule {}
