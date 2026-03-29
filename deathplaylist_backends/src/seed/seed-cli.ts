/**
 * Standalone seed runner — not part of the NestJS app lifecycle.
 * Usage: npm run seed
 */
import { DataSource } from 'typeorm';
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

async function runSeed() {
  const ds = new DataSource({
    type: 'better-sqlite3',
    database: process.env.DB_DATABASE || 'death_playlist.db',
    entities: [Song, User, Playlist, PlaylistSong, Friendship],
    synchronize: true,
  });

  await ds.initialize();
  console.log('📦 Connected to database');

  const songRepo = ds.getRepository(Song);
  const userRepo = ds.getRepository(User);
  const playlistRepo = ds.getRepository(Playlist);
  const psRepo = ds.getRepository(PlaylistSong);
  const friendshipRepo = ds.getRepository(Friendship);

  // Check if already seeded
  if ((await songRepo.count()) > 0) {
    console.log('⏭️  Database already seeded, skipping.');
    await ds.destroy();
    return;
  }

  // Seed songs
  const songs: Song[] = [];
  for (const s of SEED_SONGS) {
    songs.push(await songRepo.save(songRepo.create(s)));
  }

  // Seed users
  const users = await userRepo.save([
    userRepo.create({ wechatOpenId: 'mock_阿强', nickname: '阿强', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' }),
    userRepo.create({ wechatOpenId: 'mock_小雅', nickname: '小雅', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka' }),
    userRepo.create({ wechatOpenId: 'mock_老李', nickname: '老李', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=George' }),
    userRepo.create({ wechatOpenId: 'mock_陈二忠', nickname: '陈二忠', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ChenErzhong' }),
  ]);

  // Seed playlists
  const pl1 = await playlistRepo.save(playlistRepo.create({ userId: users[0].id, intro: '最后一程，想听点燥的，别哭。' }));
  await psRepo.save([
    psRepo.create({ playlistId: pl1.id, songId: songs[0].id, sortOrder: 0 }),
    psRepo.create({ playlistId: pl1.id, songId: songs[1].id, sortOrder: 1 }),
    psRepo.create({ playlistId: pl1.id, songId: songs[7].id, sortOrder: 2 }),
  ]);

  const pl2 = await playlistRepo.save(playlistRepo.create({ userId: users[1].id, intro: '安静地离开，像风一样自由。' }));
  await psRepo.save([
    psRepo.create({ playlistId: pl2.id, songId: songs[2].id, sortOrder: 0 }),
    psRepo.create({ playlistId: pl2.id, songId: songs[5].id, sortOrder: 1 }),
  ]);

  const pl3 = await playlistRepo.save(playlistRepo.create({ userId: users[2].id, intro: '这辈子值了，下辈子再见。' }));
  await psRepo.save([
    psRepo.create({ playlistId: pl3.id, songId: songs[3].id, sortOrder: 0 }),
    psRepo.create({ playlistId: pl3.id, songId: songs[4].id, sortOrder: 1 }),
    psRepo.create({ playlistId: pl3.id, songId: songs[9].id, sortOrder: 2 }),
  ]);

  // Seed friendships
  const u4 = users[3];
  await friendshipRepo.save(
    [0, 1, 2].flatMap((i) => [
      friendshipRepo.create({ userId: u4.id, friendId: users[i].id }),
      friendshipRepo.create({ userId: users[i].id, friendId: u4.id }),
    ]),
  );

  console.log('✅ Seed complete!');
  await ds.destroy();
}

runSeed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
