import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Playlist } from '../playlists/playlist.entity';
import { Friendship } from '../friends/friendship.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  wechatOpenId: string;

  @Column({ length: 50 })
  nickname: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: 0 })
  likes: number;

  @OneToMany(() => Playlist, (playlist) => playlist.user)
  playlists: Playlist[];

  @OneToMany(() => Friendship, (f) => f.user)
  friendships: Friendship[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
