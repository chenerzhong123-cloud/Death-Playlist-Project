import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Friendship } from './friendship.entity';
import { User } from '../users/user.entity';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friendship)
    private friendshipRepo: Repository<Friendship>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async addFriend(userId: string, friendId: string): Promise<Friendship> {
    if (userId === friendId) {
      throw new BadRequestException('不能添加自己为好友');
    }

    const existing = await this.friendshipRepo.findOne({
      where: { userId, friendId },
    });
    if (existing) return existing;

    const friendship = this.friendshipRepo.create({ userId, friendId });
    await this.friendshipRepo.save(friendship);

    const reverse = this.friendshipRepo.create({
      userId: friendId,
      friendId: userId,
    });
    await this.friendshipRepo.save(reverse);

    return friendship;
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
