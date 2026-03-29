import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friendship } from './friendship.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friendship)
    private friendshipRepo: Repository<Friendship>,
    private usersService: UsersService,
  ) {}

  async addFriend(userId: string, friendId: string): Promise<Friendship> {
    if (userId === friendId) {
      throw new Error('不能添加自己为好友');
    }
    // Check if already friends
    const existing = await this.friendshipRepo.findOne({
      where: { userId, friendId },
    });
    if (existing) return existing;

    const friendship = this.friendshipRepo.create({ userId, friendId });
    await this.friendshipRepo.save(friendship);

    // Create reverse friendship
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

    const friends = await Promise.all(
      friendIds.map((id) => this.usersService.findById(id)),
    );
    return friends.map((f) => ({
      id: f.id,
      nickname: f.nickname,
      avatar: f.avatar,
      likes: f.likes,
    }));
  }
}
