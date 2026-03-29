import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
  Body,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsString } from 'class-validator';

class AddFriendDto {
  @IsString()
  friendId: string;
}

@Controller('friends')
export class FriendsController {
  constructor(private friendsService: FriendsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getFriends(@Request() req: { user: { userId: string } }) {
    return this.friendsService.getFriends(req.user.userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async addFriend(
    @Request() req: { user: { userId: string } },
    @Body() dto: AddFriendDto,
  ) {
    const friendship = await this.friendsService.addFriend(
      req.user.userId,
      dto.friendId,
    );
    return { message: '好友添加成功', friendId: friendship.friendId };
  }

  @Delete(':friendId')
  @UseGuards(JwtAuthGuard)
  async removeFriend(
    @Request() req: { user: { userId: string } },
    @Param('friendId') friendId: string,
  ) {
    await this.friendsService.removeFriend(req.user.userId, friendId);
    return { message: '好友已移除' };
  }
}
