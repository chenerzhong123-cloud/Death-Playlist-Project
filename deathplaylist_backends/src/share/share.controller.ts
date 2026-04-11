import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
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

  @Get(':id/qrcode')
  async getQRCode(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    try {
      const buffer = await this.shareService.getQRCode(id, baseUrl);
      res.type('image/png');
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(buffer);
    } catch {
      res.status(500).send('Failed to generate QR code');
    }
  }
}
