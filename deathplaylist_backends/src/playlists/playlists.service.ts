import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    @InjectRepository(PlaylistSong)
    private playlistSongRepo: Repository<PlaylistSong>,
    private songsService: SongsService,
  ) {}

  private async upsertPlaylistSongs(
    playlistId: string,
    songs: SongInput[],
  ): Promise<void> {
    const playlistSongs: PlaylistSong[] = [];
    for (let i = 0; i < songs.length; i++) {
      const song = await this.songsService.findOrCreate({
        externalId: songs[i].externalId,
        title: songs[i].title,
        artist: songs[i].artist,
        albumArt: songs[i].albumArt || undefined,
      });
      playlistSongs.push(
        this.playlistSongRepo.create({
          playlistId,
          songId: song.id,
          sortOrder: i,
        }),
      );
    }
    await this.playlistSongRepo.save(playlistSongs);
  }

  async create(
    userId: string,
    data: { intro?: string; bgImage?: string; songs: SongInput[] },
  ): Promise<Playlist> {
    if (data.songs.length > MAX_SONGS) {
      throw new BadRequestException(`最多只能添加${MAX_SONGS}首音乐`);
    }

    const saved = await this.playlistRepo.save(
      this.playlistRepo.create({
        userId,
        intro: data.intro || '',
        bgImage: data.bgImage || undefined,
      }),
    );
    await this.upsertPlaylistSongs(saved.id, data.songs);
    return this.findById(saved.id);
  }

  async update(
    id: string,
    userId: string,
    data: { intro?: string; bgImage?: string; songs?: SongInput[] },
  ): Promise<Playlist> {
    const playlist = await this.playlistRepo.findOne({
      where: { id, userId },
    });
    if (!playlist) throw new NotFoundException('歌单不存在');

    if (data.intro !== undefined) playlist.intro = data.intro;
    if (data.bgImage !== undefined) playlist.bgImage = data.bgImage;

    const hasMetaChanges =
      data.intro !== undefined || data.bgImage !== undefined;
    if (hasMetaChanges) {
      await this.playlistRepo.save(playlist);
    }

    if (data.songs) {
      if (data.songs.length > MAX_SONGS) {
        throw new BadRequestException(`最多只能添加${MAX_SONGS}首音乐`);
      }
      await this.playlistSongRepo.delete({ playlistId: id });
      await this.upsertPlaylistSongs(id, data.songs);
    }

    return this.findById(id);
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
    const playlist = await this.playlistRepo.findOne({
      where: { id, userId },
    });
    if (!playlist) throw new NotFoundException('歌单不存在');
    await this.playlistRepo.remove(playlist);
  }

  async getPublicPlaylists(excludeUserId?: string): Promise<Playlist[]> {
    const playlists = await this.playlistRepo.find({
      relations: ['user', 'playlistSongs', 'playlistSongs.song'],
      order: { updatedAt: 'DESC' },
    });
    if (excludeUserId) {
      return playlists.filter((p) => p.userId !== excludeUserId);
    }
    return playlists;
  }

  async incrementLikes(id: string): Promise<void> {
    await this.playlistRepo.increment({ id }, 'likes', 1);
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
      songs: (playlist.playlistSongs || []).map((ps) => ({
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
