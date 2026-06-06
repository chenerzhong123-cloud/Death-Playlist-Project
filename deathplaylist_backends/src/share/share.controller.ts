import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
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

@Controller('utils')
export class UtilsController {
  @Get('image-proxy')
  async proxyImage(@Query('url') url: string, @Res() res: Response) {
    try {
      const decodedUrl = decodeURIComponent(url);
      const imageRes = await fetch(decodedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/*,*/*;q=0.8',
        },
        redirect: 'follow',
      });
      if (!imageRes.ok) {
        res.status(imageRes.status).send('Failed to fetch image');
        return;
      }
      const contentType = imageRes.headers.get('content-type') || 'image/png';
      const buffer = Buffer.from(await imageRes.arrayBuffer());
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cache-Control', 'public, max-age=604800');
      res.type(contentType);
      res.send(buffer);
    } catch {
      res.status(500).send('Failed to proxy image');
    }
  }
}
