import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Playlist } from '../playlists/playlist.entity';
import { Song } from '../songs/song.entity';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Playlist, Song])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
