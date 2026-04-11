import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Playlist } from '../playlists/playlist.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  wechatOpenId: string;

  @Column({ unique: true, nullable: true })
  deviceId: string;

  @Column({ length: 50 })
  nickname: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: 0 })
  likes: number;

  @OneToMany(() => Playlist, (playlist) => playlist.user)
  playlists: Playlist[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
