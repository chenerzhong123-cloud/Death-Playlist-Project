import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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
}
