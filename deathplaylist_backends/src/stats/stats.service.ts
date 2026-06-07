import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { User } from '../users/user.entity';
import { Playlist } from '../playlists/playlist.entity';
import { Song } from '../songs/song.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Playlist) private playlistRepo: Repository<Playlist>,
    @InjectRepository(Song) private songRepo: Repository<Song>,
  ) {}

  async getStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalUsers, usersToday, usersThisWeek, usersThisMonth] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { createdAt: MoreThanOrEqual(todayStart) } }),
      this.userRepo.count({ where: { createdAt: MoreThanOrEqual(weekStart) } }),
      this.userRepo.count({ where: { createdAt: MoreThanOrEqual(monthStart) } }),
    ]);

    const [totalPlaylists, playlistsToday, playlistsThisWeek] = await Promise.all([
      this.playlistRepo.count(),
      this.playlistRepo.count({ where: { createdAt: MoreThanOrEqual(todayStart) } }),
      this.playlistRepo.count({ where: { createdAt: MoreThanOrEqual(weekStart) } }),
    ]);

    const totalSongs = await this.songRepo.count();

    return {
      totalUsers,
      totalPlaylists,
      totalSongs,
      recentUsers: { today: usersToday, thisWeek: usersThisWeek, thisMonth: usersThisMonth },
      recentPlaylists: { today: playlistsToday, thisWeek: playlistsThisWeek },
    };
  }
}
