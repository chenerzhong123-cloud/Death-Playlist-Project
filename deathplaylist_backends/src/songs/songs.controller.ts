import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
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
    const pageLimit = limit === undefined ? 20 : Number(limit);
    const pageOffset = offset === undefined ? 0 : Number(offset);
    if (!Number.isInteger(pageLimit) || pageLimit < 1 || pageLimit > 200 ||
        !Number.isInteger(pageOffset) || pageOffset < 0 || pageOffset > 10000) {
      throw new BadRequestException('无效的分页参数');
    }
    const songs = await this.songsService.search(
      query || '',
      pageLimit,
      pageOffset,
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
