import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Song } from './song.entity';

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
    return this.songRepo.find({
      where: [
        { title: Like(`%${query}%`) },
        { artist: Like(`%${query}%`) },
      ],
      take: limit,
    });
  }

  async findById(id: string): Promise<Song> {
    return this.songRepo.findOne({ where: { id } });
  }

  async findByExternalId(externalId: string): Promise<Song | null> {
    return this.songRepo.findOne({ where: { externalId } });
  }

  async findOrCreate(songData: Partial<Song>): Promise<Song> {
    let song = await this.findByExternalId(songData.externalId);
    if (!song) {
      song = this.songRepo.create(songData);
      song = await this.songRepo.save(song);
    }
    return song;
  }
}
