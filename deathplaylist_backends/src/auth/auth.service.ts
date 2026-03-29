import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  /** Mock WeChat login — creates/finds user and returns JWT */
  async mockWechatLogin(nickname: string) {
    const user = await this.usersService.findOrCreateByWechat(
      `mock_${nickname}`,
      nickname,
    );
    const payload = { sub: user.id, nickname: user.nickname };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
      },
    };
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }
}
