import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

const WECHAT_APP_ID = process.env.WECHAT_APP_ID || '';
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || '';

interface WxSessionResponse {
  openid?: string;
  session_key?: string;
  errcode?: number;
  errmsg?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  /** WeChat login — exchange js code for openid via jscode2session */
  async wechatLogin(code: string) {
    const wxData = await this.jscode2session(code);
    if (!wxData.openid) {
      throw new UnauthorizedException(
        `微信登录失败: ${wxData.errmsg || '未获取到openid'}`,
      );
    }

    const user = await this.usersService.findOrCreateByWechat(
      wxData.openid,
      '微信用户',
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

  /** Mock login fallback — for local dev when no real WeChat code is available */
  async mockLogin(nickname: string) {
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

  private async jscode2session(code: string): Promise<WxSessionResponse> {
    if (!WECHAT_APP_ID || WECHAT_APP_ID === 'your_app_id') {
      // No real WeChat credentials configured — return mock openid
      return { openid: `mock_${code}`, session_key: 'mock_session_key' };
    }

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}&js_code=${code}&grant_type=authorization_code`;
    const res = await fetch(url);
    const data = (await res.json()) as WxSessionResponse;

    if (data.errcode) {
      throw new UnauthorizedException(
        `微信接口错误: ${data.errcode} ${data.errmsg}`,
      );
    }
    return data;
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }
}
