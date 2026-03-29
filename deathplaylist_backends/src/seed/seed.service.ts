import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Song } from '../songs/song.entity';
import { User } from '../users/user.entity';
import { Playlist } from '../playlists/playlist.entity';
import { PlaylistSong } from '../playlists/playlist-song.entity';
import { Friendship } from '../friends/friendship.entity';

const SEED_SONGS = [
  { externalId: '1', title: 'Bohemian Rhapsody', artist: 'Queen', albumArt: 'https://picsum.photos/seed/queen/100/100' },
  { externalId: '2', title: 'Stairway to Heaven', artist: 'Led Zeppelin', albumArt: 'https://picsum.photos/seed/led/100/100' },
  { externalId: '3', title: 'Imagine', artist: 'John Lennon', albumArt: 'https://picsum.photos/seed/lennon/100/100' },
  { externalId: '4', title: 'Hotel California', artist: 'Eagles', albumArt: 'https://picsum.photos/seed/eagles/100/100' },
  { externalId: '5', title: 'Wish You Were Here', artist: 'Pink Floyd', albumArt: 'https://picsum.photos/seed/floyd/100/100' },
  { externalId: '6', title: 'Yesterday', artist: 'The Beatles', albumArt: 'https://picsum.photos/seed/beatles/100/100' },
  { externalId: '7', title: 'Hallelujah', artist: 'Jeff Buckley', albumArt: 'https://picsum.photos/seed/jeff/100/100' },
  { externalId: '8', title: 'Purple Rain', artist: 'Prince', albumArt: 'https://picsum.photos/seed/prince/100/100' },
  { externalId: '9', title: 'Life on Mars?', artist: 'David Bowie', albumArt: 'https://picsum.photos/seed/bowie/100/100' },
  { externalId: '10', title: 'Bridge Over Troubled Water', artist: 'Simon & Garfunkel', albumArt: 'https://picsum.photos/seed/simon/100/100' },
];

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(Song) private songRepo: Repository<Song>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Playlist) private playlistRepo: Repository<Playlist>,
    @InjectRepository(PlaylistSong) private psRepo: Repository<PlaylistSong>,
    @InjectRepository(Friendship) private friendshipRepo: Repository<Friendship>,
  ) {}

  async onModuleInit() {
    const songCount = await this.songRepo.count();
    if (songCount > 0) return; // Already seeded

    console.log('🌱 Seeding database...');

    // Seed songs
    const songs: Song[] = [];
    for (const s of SEED_SONGS) {
      const song = this.songRepo.create(s);
      songs.push(await this.songRepo.save(song));
    }

    // Seed users (matching frontend mock friends)
    const userAqiang = this.userRepo.create({
      wechatOpenId: 'mock_阿强',
      nickname: '阿强',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    });
    const userXiaoya = this.userRepo.create({
      wechatOpenId: 'mock_小雅',
      nickname: '小雅',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    });
    const userLaoli = this.userRepo.create({
      wechatOpenId: 'mock_老李',
      nickname: '老李',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=George',
    });
    // Default test user
    const userChen = this.userRepo.create({
      wechatOpenId: 'mock_陈二忠',
      nickname: '陈二忠',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ChenErzhong',
    });

    const [u1, u2, u3, u4] = await this.userRepo.save([
      userAqiang,
      userXiaoya,
      userLaoli,
      userChen,
    ]);

    // Seed playlists for friends
    const p1 = this.playlistRepo.create({
      userId: u1.id,
      intro: '最后一程，想听点燥的，别哭。',
    });
    const savedP1 = await this.playlistRepo.save(p1);
    await this.psRepo.save([
      this.psRepo.create({ playlistId: savedP1.id, songId: songs[0].id, sortOrder: 0 }),
      this.psRepo.create({ playlistId: savedP1.id, songId: songs[1].id, sortOrder: 1 }),
      this.psRepo.create({ playlistId: savedP1.id, songId: songs[7].id, sortOrder: 2 }),
    ]);

    const p2 = this.playlistRepo.create({
      userId: u2.id,
      intro: '安静地离开，像风一样自由。',
    });
    const savedP2 = await this.playlistRepo.save(p2);
    await this.psRepo.save([
      this.psRepo.create({ playlistId: savedP2.id, songId: songs[2].id, sortOrder: 0 }),
      this.psRepo.create({ playlistId: savedP2.id, songId: songs[5].id, sortOrder: 1 }),
    ]);

    const p3 = this.playlistRepo.create({
      userId: u3.id,
      intro: '这辈子值了，下辈子再见。',
    });
    const savedP3 = await this.playlistRepo.save(p3);
    await this.psRepo.save([
      this.psRepo.create({ playlistId: savedP3.id, songId: songs[3].id, sortOrder: 0 }),
      this.psRepo.create({ playlistId: savedP3.id, songId: songs[4].id, sortOrder: 1 }),
      this.psRepo.create({ playlistId: savedP3.id, songId: songs[9].id, sortOrder: 2 }),
    ]);

    // Seed friendships: 陈二忠 is friends with 阿强, 小雅, 老李
    const friendPairs = [
      { userId: u4.id, friendId: u1.id },
      { userId: u1.id, friendId: u4.id },
      { userId: u4.id, friendId: u2.id },
      { userId: u2.id, friendId: u4.id },
      { userId: u4.id, friendId: u3.id },
      { userId: u3.id, friendId: u4.id },
    ];
    await this.friendshipRepo.save(
      friendPairs.map((fp) => this.friendshipRepo.create(fp)),
    );

    console.log('✅ Seed complete: 10 songs, 4 users, 3 playlists, friendships');
  }
}
