import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Playlist } from './playlist.entity';
import { Song } from '../songs/song.entity';

@Entity('playlist_songs')
export class PlaylistSong {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  playlistId: string;

  @Column({ type: 'uuid' })
  songId: string;

  @Column()
  sortOrder: number;

  @ManyToOne(() => Playlist, (playlist) => playlist.playlistSongs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'playlistId' })
  playlist: Playlist;

  @ManyToOne(() => Song)
  @JoinColumn({ name: 'songId' })
  song: Song;
}
