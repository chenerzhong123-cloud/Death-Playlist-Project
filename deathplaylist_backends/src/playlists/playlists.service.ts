import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, Not } from 'typeorm';
import { Song } from '../songs/song.entity';
import { Playlist } from './playlist.entity';
import { PlaylistSong } from './playlist-song.entity';
import { SongsService } from '../songs/songs.service';

const MAX_SONGS = 9;

interface SongInput {
  externalId: string;
  title: string;
  artist: string;
  albumArt?: string;
}

@Injectable()
export class PlaylistsService {
  constructor(
    @InjectRepository(Playlist)
    private playlistRepo: Repository<Playlist>,
    private songsService: SongsService,
  ) {}

  private async upsertPlaylistSongs(
    playlistId: string,
    songs: SongInput[],
    manager: EntityManager,
  ): Promise<void> {
    const playlistSongs: PlaylistSong[] = [];
    const songIds = new Set<string>();
    for (let i = 0; i < songs.length; i++) {
      const song = await this.songsService.findOrCreate({
        externalId: songs[i].externalId,
        title: songs[i].title,
        artist: songs[i].artist,
        albumArt: songs[i].albumArt || undefined,
      }, manager.getRepository(Song));
      if (songIds.has(song.id)) throw new BadRequestException('不能重复添加同一首歌曲');
      songIds.add(song.id);
      playlistSongs.push(
        manager.create(PlaylistSong, {
          playlistId,
          songId: song.id,
          sortOrder: i,
        }),
      );
    }
    await manager.save(PlaylistSong, playlistSongs);
  }

  // SQLite uses a single connection: serialize playlist transactions so overlapping
  // requests cannot commit/roll back each other's writes.
  private mutationTail: Promise<unknown> = Promise.resolve();

  private mutate<T>(action: () => Promise<T>): Promise<T> {
    const result = this.mutationTail.then(action);
    this.mutationTail = result.catch(() => undefined);
    return result;
  }

  private validateSongs(songs: SongInput[]) {
    if (!songs.length || songs.length > MAX_SONGS) {
      throw new BadRequestException(`歌单需包含1至${MAX_SONGS}首音乐`);
    }
  }

  async create(
    userId: string,
    data: { intro?: string; bgImage?: string; songs: SongInput[] },
  ): Promise<Playlist> {
    this.validateSongs(data.songs);
    return this.mutate(async () => {
      const id = await this.playlistRepo.manager.transaction(async (manager) => {
        const existing = await manager.findOneBy(Playlist, { userId });
        if (existing) throw new BadRequestException('每人只能创建一份歌单，请使用更新接口');
        const saved = await manager.save(Playlist, manager.create(Playlist, {
          userId, intro: data.intro || '', bgImage: data.bgImage || undefined,
        }));
        await this.upsertPlaylistSongs(saved.id, data.songs, manager);
        return saved.id;
      });
      return this.findById(id);
    });
  }

  async update(
    id: string,
    userId: string,
    data: { intro?: string; bgImage?: string; songs?: SongInput[] },
  ): Promise<Playlist> {
    if (data.songs !== undefined) this.validateSongs(data.songs);
    return this.mutate(async () => {
      await this.playlistRepo.manager.transaction(async (manager) => {
        const playlist = await manager.findOneBy(Playlist, { id, userId });
        if (!playlist) throw new NotFoundException('歌单不存在');
        if (data.intro !== undefined) playlist.intro = data.intro;
        if (data.bgImage !== undefined) playlist.bgImage = data.bgImage;
        // Always touch updatedAt, including updates that only reorder songs.
        playlist.updatedAt = new Date();
        await manager.save(Playlist, playlist);
        if (data.songs !== undefined) {
          await manager.delete(PlaylistSong, { playlistId: id });
          await this.upsertPlaylistSongs(id, data.songs, manager);
        }
      });
      return this.findById(id);
    });
  }

  async findById(id: string): Promise<Playlist> {
    const playlist = await this.playlistRepo.findOne({
      where: { id },
      relations: ['user', 'playlistSongs', 'playlistSongs.song'],
    });
    if (!playlist) throw new NotFoundException('歌单不存在');
    playlist.playlistSongs.sort((a, b) => a.sortOrder - b.sortOrder);
    return playlist;
  }

  async findByUserId(userId: string): Promise<Playlist[]> {
    return this.playlistRepo.find({
      where: { userId },
      relations: ['user', 'playlistSongs', 'playlistSongs.song'],
      order: { updatedAt: 'DESC' },
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.mutate(async () => {
      const playlist = await this.playlistRepo.findOneBy({ id, userId });
      if (!playlist) throw new NotFoundException('歌单不存在');
      await this.playlistRepo.remove(playlist);
    });
  }

  async getPublicPlaylists(excludeUserId?: string): Promise<Playlist[]> {
    const playlists = await this.playlistRepo.find({
      relations: ['user', 'playlistSongs', 'playlistSongs.song'],
      where: excludeUserId ? { userId: Not(excludeUserId) } : {},
      order: { updatedAt: 'DESC' },
    });
    return playlists;
  }

  async incrementLikes(id: string): Promise<void> {
    const result = await this.playlistRepo.increment({ id }, 'likes', 1);
    if (!result.affected) throw new NotFoundException('歌单不存在');
  }

  formatPlaylist(playlist: Playlist) {
    return {
      id: playlist.id,
      intro: playlist.intro,
      bgImage: playlist.bgImage,
      likes: playlist.likes,
      user: playlist.user
        ? {
            id: playlist.user.id,
            name: playlist.user.nickname,
            avatar: playlist.user.avatar,
          }
        : null,
      songs: [...(playlist.playlistSongs || [])].sort((a, b) => a.sortOrder - b.sortOrder).map((ps) => ({
        id: ps.song.id,
        externalId: ps.song.externalId,
        title: ps.song.title,
        artist: ps.song.artist,
        albumArt: ps.song.albumArt,
        sortOrder: ps.sortOrder,
      })),
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
    };
  }
}
