import { BadRequestException, Controller, Get, Param, Query, Req, Res, ServiceUnavailableException } from '@nestjs/common';
import { Request, Response } from 'express';
import { ShareService } from './share.service';

@Controller('share')
export class ShareController {
  constructor(private shareService: ShareService) {}

  @Get(':id')
  getShareData(@Param('id') id: string, @Req() req: Request) {
    return this.shareService.getShareData(id, `${req.protocol}://${req.get('host')}`);
  }

  @Get(':id/qrcode')
  async getQRCode(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const buffer = await this.shareService.getQRCode(id, `${req.protocol}://${req.get('host')}`);
    res.type('image/png').set('Cache-Control', 'public, max-age=86400').send(buffer);
  }

  @Get(':id/wxacode')
  async getWxaCode(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.shareService.getWxaCode(id);
    res.type('image/png').set('Cache-Control', 'public, max-age=86400').send(buffer);
  }
}

// Only the existing artwork providers may be fetched. Validate each redirect as
// well, so this public endpoint cannot reach loopback, metadata or private URLs.
function artworkUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new BadRequestException('无效的图片地址'); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') ||
      !(host.endsWith('.mzstatic.com') || host === 'picsum.photos' || host === 'fastly.picsum.photos')) {
    throw new BadRequestException('不支持的图片地址');
  }
  return url;
}

@Controller('utils')
export class UtilsController {
  @Get('image-proxy')
  async proxyImage(@Query('url') value: string, @Res() res: Response) {
    // Express has already decoded the query string; decoding twice breaks URLs.
    let url = artworkUrl(value);
    const signal = AbortSignal.timeout(8000);
    for (let i = 0; i <= 3; i++) {
      let image: globalThis.Response;
      try { image = await fetch(url, { redirect: 'manual', signal }); }
      catch { throw new ServiceUnavailableException('图片加载失败'); }
      if ([301, 302, 303, 307, 308].includes(image.status)) {
        const location = image.headers.get('location');
        await image.body?.cancel();
        if (!location) throw new ServiceUnavailableException('图片加载失败');
        url = artworkUrl(new URL(location, url).toString());
        continue;
      }
      const type = image.headers.get('content-type') || '';
      if (!image.ok || !/^image\/(jpeg|png|webp|gif|avif)(;|$)/i.test(type)) {
        await image.body?.cancel();
        throw new ServiceUnavailableException('图片加载失败');
      }
      const reader = image.body?.getReader();
      if (!reader) throw new ServiceUnavailableException('图片加载失败');
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          size += chunk.length;
          if (size > 5 * 1024 * 1024) {
            await reader.cancel();
            throw new Error('Image too large');
          }
          chunks.push(chunk);
        }
      } catch { throw new ServiceUnavailableException('图片加载失败'); }
      res.set('Cache-Control', 'public, max-age=604800').type(type).send(Buffer.concat(chunks));
      return;
    }
    throw new ServiceUnavailableException('图片加载失败');
  }
}
