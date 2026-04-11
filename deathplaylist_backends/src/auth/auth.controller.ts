import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsString, IsNotEmpty } from 'class-validator';

class DeviceLoginDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('device')
  @HttpCode(200)
  async deviceLogin(@Body() dto: DeviceLoginDto) {
    return this.authService.deviceLogin(dto.deviceId);
  }
}
