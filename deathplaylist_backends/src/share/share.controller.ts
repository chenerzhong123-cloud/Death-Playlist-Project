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

  @Get(':id/wxacode')
  async getWxaCode(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.shareService.getWxaCode(id);
      res.type('image/png');
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(buffer);
    } catch {
      // Fallback: proxy QR image from external service (wx.downloadFile can't follow redirects)
      try {
        const host = req.get('host');
        const protocol = req.protocol;
        const shareUrl = `${protocol}://${host}/api/share/${id}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&color=ffffff&bgcolor=0&format=png&data=${encodeURIComponent(shareUrl)}`;
        const qrRes = await fetch(qrUrl);
        const buffer = Buffer.from(await qrRes.arrayBuffer());
        res.type('image/png');
        res.set('Cache-Control', 'public, max-age=86400');
        res.send(buffer);
      } catch {
        res.status(500).send('Failed to generate QR code');
      }
    }
  }
}
