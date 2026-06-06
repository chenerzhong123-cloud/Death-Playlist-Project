import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('songs')
export class Song {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  externalId: string;

  @Column({ length: 200 })
  title: string;

  @Column({ length: 200 })
  artist: string;

  @Column({ nullable: true })
  albumArt: string;

  @Column({ nullable: true, length: 200 })
  album: string;

  @Column({ nullable: true })
  duration: number;

  @CreateDateColumn()
  createdAt: Date;
}
