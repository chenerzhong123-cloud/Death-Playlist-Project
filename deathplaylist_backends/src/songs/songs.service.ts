import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Song } from './song.entity';

interface ITunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackTimeMillis?: number;
}

interface ITunesResponse {
  resultCount: number;
  results: ITunesResult[];
}

@Injectable()
export class SongsService {
  constructor(
    @InjectRepository(Song)
    private songRepo: Repository<Song>,
  ) {}

  private searchCache = new Map<string, { results: ITunesResult[]; expiresAt: number }>();
  private searches = new Map<string, Promise<ITunesResult[]>>();

  private async searchITunes(query: string): Promise<ITunesResult[]> {
    const cached = this.searchCache.get(query);
    if (cached && cached.expiresAt > Date.now()) return cached.results;
    const existing = this.searches.get(query);
    if (existing) return existing;
    const request = (async () => {
      // iTunes Search has a 200-result limit and no documented offset. Fetch one
      // stable result set and page it locally instead of repeating page one.
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=200&country=CN`;
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Song search unavailable');
      const data = await response.json() as ITunesResponse;
      if (!Array.isArray(data.results)) throw new Error('Invalid song search response');
      const results = [...new Map(data.results.filter(item => item.trackId).map(item => [item.trackId, item])).values()];
      if (this.searchCache.size >= 100) this.searchCache.delete(this.searchCache.keys().next().value!);
      this.searchCache.set(query, { results, expiresAt: Date.now() + 5 * 60 * 1000 });
      return results;
    })().finally(() => { this.searches.delete(query); });
    this.searches.set(query, request);
    return request;
  }

  async search(query: string, limit = 20, offset = 0): Promise<Song[]> {
    query = query.trim();
    if (!query) return this.songRepo.find({ take: limit, skip: offset, order: { id: 'ASC' } });
    try {
      const results = await this.searchITunes(query);
      if (results.length) {
        const songs: Song[] = [];
        for (const item of results.slice(offset, offset + limit)) songs.push(await this.upsertFromiTunes(item));
        return songs;
      }
    } catch {
      // Keep the same library available when the external provider is offline.
    }
    return this.songRepo.find({
      where: [{ title: Like(`%${query}%`) }, { artist: Like(`%${query}%`) }],
      take: limit, skip: offset, order: { id: 'ASC' },
    });
  }

  private async upsertFromiTunes(item: ITunesResult): Promise<Song> {
    const externalId = String(item.trackId);
    await this.songRepo.createQueryBuilder().insert().values({
      externalId,
      title: item.trackName || '未知歌曲',
      artist: item.artistName || '未知歌手',
      albumArt: item.artworkUrl100?.replace('100x100', '300x300') || undefined,
      album: item.collectionName || undefined,
      duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : undefined,
    }).orIgnore().execute();
    return (await this.findByExternalId(externalId))!;
  }

  async findById(id: string): Promise<Song> {
    const song = await this.songRepo.findOne({ where: { id } });
    if (!song) throw new NotFoundException('歌曲不存在');
    return song;
  }

  async findByExternalId(externalId: string): Promise<Song | null> {
    return this.songRepo.findOne({ where: { externalId } });
  }

  async findOrCreate(songData: {
    externalId: string;
    title: string;
    artist: string;
    albumArt?: string;
  }, repo: Repository<Song> = this.songRepo): Promise<Song> {
    // Older H5 builds sent the database UUID as externalId. Resolve existing
    // UUID aliases without modifying or deleting any historical library rows.
    let canonical = await repo.findOneBy({ id: songData.externalId });
    const seen = new Set<string>();
    while (canonical && !seen.has(canonical.id)) {
      seen.add(canonical.id);
      const parent = await repo.findOneBy({ id: canonical.externalId });
      if (!parent) return canonical;
      canonical = parent;
    }
    let song = await repo.findOneBy({ externalId: songData.externalId });
    if (!song) {
      await repo.createQueryBuilder().insert().values(songData).orIgnore().execute();
      song = await repo.findOneBy({ externalId: songData.externalId });
    }
    return song!;
  }
}
