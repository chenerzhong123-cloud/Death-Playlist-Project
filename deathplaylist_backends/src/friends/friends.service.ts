import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Friendship } from './friendship.entity';
import { User } from '../users/user.entity';

@Injectable()
export class FriendsService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Friendship)
    private friendshipRepo: Repository<Friendship>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async addFriend(userId: string, friendId: string): Promise<Friendship> {
    if (userId === friendId) {
      throw new BadRequestException('不能添加自己为好友');
    }

    const friendExists = await this.userRepo.findOne({ where: { id: friendId } });
    if (!friendExists) {
      throw new BadRequestException('好友不存在');
    }

    const existing = await this.friendshipRepo.findOne({
      where: { userId, friendId },
    });
    if (existing) return existing;

    await this.dataSource.transaction(async (manager) => {
      await manager.save(Friendship, [
        manager.create(Friendship, { userId, friendId }),
        manager.create(Friendship, { userId: friendId, friendId: userId }),
      ]);
    });

    return this.friendshipRepo.findOne({ where: { userId, friendId } }) as Promise<Friendship>;
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    await this.friendshipRepo.delete([
      { userId, friendId },
      { userId: friendId, friendId: userId },
    ]);
  }

  async getFriends(userId: string) {
    const friendships = await this.friendshipRepo.find({
      where: { userId },
    });
    const friendIds = friendships.map((f) => f.friendId);
    if (friendIds.length === 0) return [];

    const friends = await this.userRepo.find({
      where: { id: In(friendIds) },
    });
    return friends.map((f) => ({
      id: f.id,
      nickname: f.nickname,
      avatar: f.avatar,
      likes: f.likes,
    }));
  }
}
