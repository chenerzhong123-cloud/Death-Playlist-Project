import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { PlaylistsService } from './playlists.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsString, IsOptional, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

class SongItemDto {
  @IsString()
  externalId: string;

  @IsString()
  title: string;

  @IsString()
  artist: string;

  @IsOptional()
  @IsString()
  albumArt?: string;
}

class CreatePlaylistDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  intro?: string;

  @IsOptional()
  @IsString()
  bgImage?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SongItemDto)
  songs: SongItemDto[];
}

class UpdatePlaylistDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  intro?: string;

  @IsOptional()
  @IsString()
  bgImage?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SongItemDto)
  songs?: SongItemDto[];
}

@Controller('playlists')
export class PlaylistsController {
  constructor(private playlistsService: PlaylistsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreatePlaylistDto,
  ) {
    const existing = await this.playlistsService.findByUserId(req.user.userId);
    if (existing.length > 0) {
      throw new BadRequestException('每人只能创建一份歌单，请使用更新接口');
    }
    const playlist = await this.playlistsService.create(req.user.userId, dto);
    return this.playlistsService.formatPlaylist(playlist);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyPlaylists(@Request() req: { user: { userId: string } }) {
    const playlists = await this.playlistsService.findByUserId(req.user.userId);
    return playlists.map((p) => this.playlistsService.formatPlaylist(p));
  }

  @Get('public')
  @UseGuards(JwtAuthGuard)
  async getPublicPlaylists(@Request() req: { user: { userId: string } }) {
    const playlists = await this.playlistsService.getPublicPlaylists(
      req.user.userId,
    );
    return playlists.map((p) => this.playlistsService.formatPlaylist(p));
  }

  @Get(':id')
  async getPlaylist(@Param('id') id: string) {
    const playlist = await this.playlistsService.findById(id);
    return this.playlistsService.formatPlaylist(playlist);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: UpdatePlaylistDto,
  ) {
    const playlist = await this.playlistsService.update(
      id,
      req.user.userId,
      dto,
    );
    return this.playlistsService.formatPlaylist(playlist);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    await this.playlistsService.delete(id, req.user.userId);
    return { message: '歌单已删除' };
  }

  @Post(':id/like')
  async likePlaylist(@Param('id') id: string) {
    await this.playlistsService.incrementLikes(id);
    return { message: '已点赞' };
  }
}
