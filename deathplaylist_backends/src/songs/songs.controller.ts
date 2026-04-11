import { Controller, Get, Query } from '@nestjs/common';
import { SongsService } from './songs.service';

@Controller('songs')
export class SongsController {
  constructor(private songsService: SongsService) {}

  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const songs = await this.songsService.search(
      query || '',
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
    return songs.map((s) => ({
      id: s.id,
      externalId: s.externalId,
      title: s.title,
      artist: s.artist,
      albumArt: s.albumArt,
      album: s.album,
      duration: s.duration,
    }));
  }
}
