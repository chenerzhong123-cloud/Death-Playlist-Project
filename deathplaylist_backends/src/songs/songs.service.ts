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

  async search(query: string, limit = 20): Promise<Song[]> {
    if (!query.trim()) {
      return this.songRepo.find({ take: limit });
    }

    // Try iTunes Search API first, cache results locally
    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=${limit}&country=CN`;
      const res = await fetch(url);
      const data = (await res.json()) as ITunesResponse;

      if (data.results && data.results.length > 0) {
        const songs: Song[] = [];
        for (const item of data.results) {
          const song = await this.upsertFromiTunes(item);
          songs.push(song);
        }
        return songs;
      }
    } catch {
      // iTunes API failed — fall through to local search
    }

    // Fallback: search local DB
    return this.songRepo.find({
      where: [
        { title: Like(`%${query}%`) },
        { artist: Like(`%${query}%`) },
      ],
      take: limit,
    });
  }

  private async upsertFromiTunes(item: ITunesResult): Promise<Song> {
    const externalId = String(item.trackId);
    let song = await this.songRepo.findOne({ where: { externalId } });

    if (!song) {
      song = this.songRepo.create({
        externalId,
        title: item.trackName || '未知歌曲',
        artist: item.artistName || '未知歌手',
        albumArt: item.artworkUrl100?.replace('100x100', '300x300') || undefined,
        album: item.collectionName || undefined,
        duration: item.trackTimeMillis
          ? Math.round(item.trackTimeMillis / 1000)
          : undefined,
      });
      song = await this.songRepo.save(song);
    }

    return song;
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
  }): Promise<Song> {
    let song = await this.findByExternalId(songData.externalId);
    if (!song) {
      song = this.songRepo.create(songData);
      song = await this.songRepo.save(song);
    }
    return song;
  }
}
