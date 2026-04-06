import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsString, IsNotEmpty, IsOptional, Length } from 'class-validator';

class WechatLoginDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  @Length(0, 50)
  nickname?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('wechat')
  @HttpCode(200)
  async wechatLogin(@Body() dto: WechatLoginDto) {
    // If code looks like a mock code (short string or 'mock_'), use mock login
    if (dto.code.startsWith('mock_') || dto.code.length < 10) {
      const nickname = dto.nickname || dto.code;
      return this.authService.mockLogin(nickname);
    }
    // Try real WeChat login, fall back to mock if it fails
    try {
      return await this.authService.wechatLogin(dto.code, dto.nickname);
    } catch {
      const nickname = dto.nickname || '微信用户';
      return this.authService.mockLogin(nickname);
    }
  }
}
