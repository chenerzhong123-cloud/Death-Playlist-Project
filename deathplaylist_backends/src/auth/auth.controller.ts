import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

class DeviceLoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  deviceId: string;
}

class WechatLoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('wechat')
  @HttpCode(200)
  async wechatLogin(@Body() dto: WechatLoginDto) {
    return this.authService.wechatLogin(dto.code, dto.nickname);
  }

  @Post('device')
  @HttpCode(200)
  async deviceLogin(@Body() dto: DeviceLoginDto) {
    return this.authService.deviceLogin(dto.deviceId);
  }
}
