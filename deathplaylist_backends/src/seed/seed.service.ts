import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Song } from '../songs/song.entity';
import { User } from '../users/user.entity';
import { Playlist } from '../playlists/playlist.entity';
import { PlaylistSong } from '../playlists/playlist-song.entity';

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
  ) {}

  async onModuleInit() {
    if ((await this.songRepo.count()) > 0) return;

    console.log('🌱 Seeding database...');

    const songs = await this.songRepo.save(
      SEED_SONGS.map((s) => this.songRepo.create(s)),
    );

    const [u1, u2, u3, u4] = await this.userRepo.save([
      this.userRepo.create({ wechatOpenId: 'mock_阿强', nickname: '阿强', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' }),
      this.userRepo.create({ wechatOpenId: 'mock_小雅', nickname: '小雅', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka' }),
      this.userRepo.create({ wechatOpenId: 'mock_老李', nickname: '老李', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=George' }),
      this.userRepo.create({ wechatOpenId: 'mock_陈二忠', nickname: '陈二忠', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ChenErzhong' }),
    ]);

    const pl1 = await this.playlistRepo.save(
      this.playlistRepo.create({ userId: u1.id, intro: '最后一程，想听点燥的，别哭。' }),
    );
    await this.psRepo.save([
      this.psRepo.create({ playlistId: pl1.id, songId: songs[0].id, sortOrder: 0 }),
      this.psRepo.create({ playlistId: pl1.id, songId: songs[1].id, sortOrder: 1 }),
      this.psRepo.create({ playlistId: pl1.id, songId: songs[7].id, sortOrder: 2 }),
    ]);

    const pl2 = await this.playlistRepo.save(
      this.playlistRepo.create({ userId: u2.id, intro: '安静地离开，像风一样自由。' }),
    );
    await this.psRepo.save([
      this.psRepo.create({ playlistId: pl2.id, songId: songs[2].id, sortOrder: 0 }),
      this.psRepo.create({ playlistId: pl2.id, songId: songs[5].id, sortOrder: 1 }),
    ]);

    const pl3 = await this.playlistRepo.save(
      this.playlistRepo.create({ userId: u3.id, intro: '这辈子值了，下辈子再见。' }),
    );
    await this.psRepo.save([
      this.psRepo.create({ playlistId: pl3.id, songId: songs[3].id, sortOrder: 0 }),
      this.psRepo.create({ playlistId: pl3.id, songId: songs[4].id, sortOrder: 1 }),
      this.psRepo.create({ playlistId: pl3.id, songId: songs[9].id, sortOrder: 2 }),
    ]);

    console.log('✅ Seed complete: 10 songs, 4 users, 3 playlists');
  }
}
