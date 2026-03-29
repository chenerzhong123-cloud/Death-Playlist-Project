import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Playlist } from './playlist.entity';
import { PlaylistSong } from './playlist-song.entity';
import { SongsService } from '../songs/songs.service';

const MAX_SONGS = 9;

@Injectable()
export class PlaylistsService {
  constructor(
    @InjectRepository(Playlist)
    private playlistRepo: Repository<Playlist>,
    @InjectRepository(PlaylistSong)
    private playlistSongRepo: Repository<PlaylistSong>,
    private songsService: SongsService,
  ) {}

  async create(
    userId: string,
    data: { intro?: string; bgImage?: string; songs: { externalId: string; title: string; artist: string; albumArt?: string }[] },
  ): Promise<Playlist> {
    if (data.songs.length > MAX_SONGS) {
      throw new BadRequestException(`最多只能添加${MAX_SONGS}首音乐`);
    }

    const playlist = this.playlistRepo.create({
      userId,
      intro: data.intro || '',
      bgImage: data.bgImage || null,
    });
    const saved = await this.playlistRepo.save(playlist);

    const playlistSongs: PlaylistSong[] = [];
    for (let i = 0; i < data.songs.length; i++) {
      const songData = data.songs[i];
      const song = await this.songsService.findOrCreate({
        externalId: songData.externalId,
        title: songData.title,
        artist: songData.artist,
        albumArt: songData.albumArt || null,
      });
      const ps = this.playlistSongRepo.create({
        playlistId: saved.id,
        songId: song.id,
        sortOrder: i,
      });
      playlistSongs.push(ps);
    }
    await this.playlistSongRepo.save(playlistSongs);

    return this.findById(saved.id);
  }

  async update(
    id: string,
    userId: string,
    data: { intro?: string; bgImage?: string; songs?: { externalId: string; title: string; artist: string; albumArt?: string }[] },
  ): Promise<Playlist> {
    const playlist = await this.playlistRepo.findOne({
      where: { id, userId },
    });
    if (!playlist) throw new NotFoundException('歌单不存在');

    if (data.intro !== undefined) playlist.intro = data.intro;
    if (data.bgImage !== undefined) playlist.bgImage = data.bgImage;
    await this.playlistRepo.save(playlist);

    if (data.songs) {
      if (data.songs.length > MAX_SONGS) {
        throw new BadRequestException(`最多只能添加${MAX_SONGS}首音乐`);
      }
      await this.playlistSongRepo.delete({ playlistId: id });

      for (let i = 0; i < data.songs.length; i++) {
        const songData = data.songs[i];
        const song = await this.songsService.findOrCreate({
          externalId: songData.externalId,
          title: songData.title,
          artist: songData.artist,
          albumArt: songData.albumArt || null,
        });
        const ps = this.playlistSongRepo.create({
          playlistId: id,
          songId: song.id,
          sortOrder: i,
        });
        await this.playlistSongRepo.save(ps);
      }
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
      relations: ['playlistSongs', 'playlistSongs.song'],
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

  async getFriendsPlaylists(userId: string): Promise<Playlist[]> {
    // Get friends' IDs from friendships
    const friendships = await this.playlistRepo.manager
      .getRepository('friendships')
      .find({ where: { userId } });

    if (friendships.length === 0) return [];

    const friendIds = friendships.map((f: { friendId: string }) => f.friendId);

    return this.playlistRepo.find({
      where: { userId: In(friendIds) },
      relations: ['user', 'playlistSongs', 'playlistSongs.song'],
      order: { updatedAt: 'DESC' },
    });
  }

  async incrementLikes(id: string): Promise<void> {
    await this.playlistRepo.increment({ id }, 'likes', 1);
  }

  /** Format playlist for API response (matches frontend FriendPlaylist interface) */
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
