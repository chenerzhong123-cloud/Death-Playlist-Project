import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async wechatLogin(code: string, nickname?: string) {
    const appId = process.env.WECHAT_APP_ID;
    const secret = process.env.WECHAT_APP_SECRET;
    if (!appId || !secret || appId === 'your_app_id' || secret === 'your_app_secret') {
      throw new ServiceUnavailableException('微信登录暂不可用');
    }
    let data: { openid?: string; errcode?: number };
    try {
      const query = new URLSearchParams({ appid: appId, secret, js_code: code, grant_type: 'authorization_code' });
      const response = await fetch(`https://api.weixin.qq.com/sns/jscode2session?${query}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('WeChat unavailable');
      data = await response.json();
    } catch {
      throw new ServiceUnavailableException('微信登录暂不可用，请重试');
    }
    if (data.errcode || !data.openid) {
      throw new UnauthorizedException('微信登录凭证无效，请重新登录');
    }
    const user = await this.usersService.findOrCreateByWechat(data.openid, nickname?.trim() || '微信用户');
    // A supplied name is an explicit profile edit; automatic login must preserve it.
    if (nickname?.trim() && nickname.trim() !== user.nickname) {
      await this.usersService.updateProfile(user.id, { nickname: nickname.trim() });
      user.nickname = nickname.trim();
    }
    return {
      accessToken: this.jwtService.sign({ sub: user.id, nickname: user.nickname }),
      user: { id: user.id, nickname: user.nickname, avatar: user.avatar },
    };
  }

  async deviceLogin(deviceId: string) {
    const user = await this.usersService.findOrCreateByDeviceId(deviceId);
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
