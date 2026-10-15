import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { toBuffer } from 'qrcode';
import { PlaylistsService } from '../playlists/playlists.service';

@Injectable()
export class ShareService {
  private accessToken = '';
  private tokenExpiresAt = 0;
  private tokenRequest: Promise<string> | null = null;

  constructor(private playlistsService: PlaylistsService) {}

  private shareUrl(playlistId: string, baseUrl: string) {
    // Explicit public URL avoids losing HTTPS / the nginx subpath behind a proxy.
    const base = process.env.PUBLIC_BASE_URL ||
      (process.env.NODE_ENV === 'production' ? 'https://www.deuce.monster/deathplaylist/' : `${baseUrl}/deathplaylist/`);
    const url = new URL(base.endsWith('/') ? base : `${base}/`);
    url.searchParams.set('playlist', playlistId);
    return url.toString();
  }

  async getShareData(playlistId: string, baseUrl: string) {
    const playlist = await this.playlistsService.findById(playlistId);
    return {
      ...this.playlistsService.formatPlaylist(playlist),
      shareUrl: this.shareUrl(playlistId, baseUrl),
      qrCodeUrl: `${new URL('.', this.shareUrl(playlistId, baseUrl))}api/share/${encodeURIComponent(playlistId)}/qrcode`,
    };
  }

  async getQRCode(playlistId: string, baseUrl: string): Promise<Buffer> {
    await this.playlistsService.findById(playlistId);
    return toBuffer(this.shareUrl(playlistId, baseUrl), { width: 280, margin: 4, errorCorrectionLevel: 'M' });
  }

  async getWxaCode(playlistId: string): Promise<Buffer> {
    await this.playlistsService.findById(playlistId);
    // UUIDs contain 36 chars; remove hyphens reversibly to fit scene's 32-char limit.
    const scene = playlistId.replace(/-/g, '');
    if (!/^[a-f0-9]{32}$/i.test(scene)) throw new ServiceUnavailableException('无效的歌单标识');
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await this.getAccessToken();
      let response: Response;
      try {
        response = await fetch(`https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({ scene, page: 'pages/index/index', width: 280,
            env_version: process.env.WECHAT_CODE_ENV || 'release', check_path: true }),
        });
      } catch {
        throw new ServiceUnavailableException('小程序码生成失败，请重试');
      }
      if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
        return Buffer.from(await response.arrayBuffer());
      }
      const data = await response.json().catch(() => ({})) as { errcode?: number };
      if (attempt === 0 && [40001, 40014, 42001].includes(data.errcode || 0)) {
        this.accessToken = '';
        continue;
      }
      throw new ServiceUnavailableException('小程序码生成失败，请重试');
    }
    throw new ServiceUnavailableException('小程序码生成失败，请重试');
  }

  private getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) return Promise.resolve(this.accessToken);
    if (!this.tokenRequest) {
      this.tokenRequest = this.fetchAccessToken().finally(() => { this.tokenRequest = null; });
    }
    return this.tokenRequest;
  }

  private async fetchAccessToken(): Promise<string> {
    const appid = process.env.WECHAT_APP_ID;
    const secret = process.env.WECHAT_APP_SECRET;
    if (!appid || !secret || appid === 'your_app_id' || secret === 'your_app_secret') {
      throw new ServiceUnavailableException('微信服务暂不可用');
    }
    try {
      const query = new URLSearchParams({ grant_type: 'client_credential', appid, secret });
      const response = await fetch(`https://api.weixin.qq.com/cgi-bin/token?${query}`, { signal: AbortSignal.timeout(10000) });
      const data = await response.json() as { access_token?: string; expires_in?: number };
      if (!response.ok || !data.access_token) throw new Error('WeChat unavailable');
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + Math.max(0, (data.expires_in || 7200) - 300) * 1000;
      return this.accessToken;
    } catch {
      throw new ServiceUnavailableException('微信服务暂不可用');
    }
  }
}
