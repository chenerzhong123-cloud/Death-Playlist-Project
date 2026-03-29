import { Controller, Get, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { ShareService } from './share.service';

@Controller('share')
export class ShareController {
  constructor(private shareService: ShareService) {}

  @Get(':id')
  async getShareData(@Param('id') id: string, @Req() req: Request) {
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    return this.shareService.getShareData(id, baseUrl);
  }
}
