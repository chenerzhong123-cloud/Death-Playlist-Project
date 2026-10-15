import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async findOrCreateByWechat(
    wechatOpenId: string,
    nickname: string,
  ): Promise<User> {
    let user = await this.userRepo.findOne({ where: { wechatOpenId } });
    if (!user) {
      user = this.userRepo.create({
        wechatOpenId,
        nickname,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nickname)}`,
      });
      await this.userRepo.createQueryBuilder().insert().values(user).orIgnore().execute();
      user = await this.userRepo.findOne({ where: { wechatOpenId } });
    }
    return user!;
  }

  async findOrCreateByDeviceId(deviceId: string): Promise<User> {
    let user = await this.userRepo.findOne({ where: { deviceId } });
    if (!user) {
      const shortId = deviceId.substring(0, 4);
      user = this.userRepo.create({
        deviceId,
        nickname: `用户${shortId}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(deviceId)}`,
      });
      await this.userRepo.createQueryBuilder().insert().values(user).orIgnore().execute();
      user = await this.userRepo.findOne({ where: { deviceId } });
    }
    return user!;
  }

  async updateProfile(
    id: string,
    data: { nickname?: string; avatar?: string },
  ): Promise<User> {
    await this.userRepo.update(id, data);
    return this.findById(id);
  }

  async incrementLikes(id: string): Promise<void> {
    await this.userRepo.increment({ id }, 'likes', 1);
  }
}
