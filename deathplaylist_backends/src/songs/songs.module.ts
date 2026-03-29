import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Song } from './song.entity';
import { SongsController } from './songs.controller';
import { SongsService } from './songs.service';

@Module({
  imports: [TypeOrmModule.forFeature([Song])],
  controllers: [SongsController],
  providers: [SongsService],
  exports: [SongsService],
})
export class SongsModule {}
