import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsString, IsOptional, Length } from 'class-validator';

class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @Length(1, 50)
  nickname?: string;

  @IsString()
  @IsOptional()
  avatar?: string;
}

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: { user: { userId: string } }) {
    const user = await this.usersService.findById(req.user.userId);
    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      likes: user.likes,
      createdAt: user.createdAt,
    };
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Request() req: { user: { userId: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateProfile(req.user.userId, dto);
    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      likes: user.likes,
    };
  }
}
