import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsString, IsNotEmpty, Length } from 'class-validator';

class WechatLoginDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  nickname: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('wechat')
  @HttpCode(200)
  async mockWechatLogin(@Body() dto: WechatLoginDto) {
    return this.authService.mockWechatLogin(dto.nickname);
  }
}
