import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Song } from '../songs/song.entity';
import { User } from '../users/user.entity';
import { Playlist } from '../playlists/playlist.entity';
import { PlaylistSong } from '../playlists/playlist-song.entity';
import { Friendship } from '../friends/friendship.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Song, User, Playlist, PlaylistSong, Friendship]),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
