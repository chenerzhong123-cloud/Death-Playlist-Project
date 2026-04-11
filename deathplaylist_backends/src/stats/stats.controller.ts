import { Controller, Get, Query, ForbiddenException } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get('admin')
  async getStats(@Query('key') key?: string) {
    const adminKey = process.env.ADMIN_PASSWORD;
    if (!adminKey || key !== adminKey) {
      throw new ForbiddenException('无权访问');
    }
    return this.statsService.getStats();
  }
}
