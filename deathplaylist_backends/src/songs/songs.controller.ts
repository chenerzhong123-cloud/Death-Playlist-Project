import { Controller, Get, Query } from '@nestjs/common';
import { SongsService } from './songs.service';

@Controller('songs')
export class SongsController {
  constructor(private songsService: SongsService) {}

  @Get('search')
  async search(@Query('q') query: string, @Query('limit') limit?: string) {
    const songs = await this.songsService.search(
      query || '',
      limit ? parseInt(limit, 10) : 20,
    );
    return songs.map((s) => ({
      id: s.id,
      externalId: s.externalId,
      title: s.title,
      artist: s.artist,
      albumArt: s.albumArt,
    }));
  }
}
