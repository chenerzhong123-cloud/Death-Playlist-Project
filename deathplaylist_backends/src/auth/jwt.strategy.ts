import { jwtSecret } from './jwt.config';
import { UsersService } from '../users/users.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret(),
    });
  }

  async validate(payload: { sub: string; nickname: string }) {
    try {
      const user = await this.usersService.findById(payload.sub);
      return { userId: user.id, nickname: user.nickname };
    } catch { throw new UnauthorizedException('登录已过期，请重新登录'); }
  }
}
