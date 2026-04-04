import { Injectable } from '@nestjs/common';
import { PlaylistsService } from '../playlists/playlists.service';

const WECHAT_APP_ID = process.env.WECHAT_APP_ID || '';
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || '';

@Injectable()
export class ShareService {
  private accessToken = '';
  private tokenExpiresAt = 0;

  constructor(private playlistsService: PlaylistsService) {}

  async getShareData(playlistId: string, baseUrl: string) {
    const playlist = await this.playlistsService.findById(playlistId);
    const formatted = this.playlistsService.formatPlaylist(playlist);

    return {
      ...formatted,
      shareUrl: `${baseUrl}/api/share/${playlistId}`,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${baseUrl}/api/share/${playlistId}`)}`,
    };
  }

  /** Generate WeChat mini program code (wxacode) for a playlist */
  async getWxaCode(playlistId: string): Promise<Buffer> {
    const token = await this.getAccessToken();
    const url = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${token}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scene: playlistId.substring(0, 32),
        page: 'pages/index/index',
        width: 280,
        auto_color: false,
        line_color: { r: 255, g: 255, b: 255 },
        is_hyaline: true,
        env_version: 'develop',
      }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('image')) {
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    // WeChat API returns JSON on error
    const data = (await res.json()) as any;
    throw new Error(data.errmsg || 'Failed to generate wxacode');
  }

  /** Proxy fallback QR image from qrserver (returns PNG buffer) */
  async getFallbackQR(shareUrl: string): Promise<Buffer> {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&color=ffffff&bgcolor=0&format=png&data=${encodeURIComponent(shareUrl)}`;
    const res = await fetch(qrUrl);
    return Buffer.from(await res.arrayBuffer());
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt && this.accessToken !== '') {
      return this.accessToken;
    }

    if (!WECHAT_APP_ID || WECHAT_APP_ID === 'your_app_id') {
      throw new Error('WeChat credentials not configured');
    }

    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}`;
    const res = await fetch(url);
    const data = (await res.json()) as any;

    if (!data.access_token) {
      throw new Error(data.errmsg || 'Failed to get access token');
    }

    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + ((data.expires_in || 7200) - 300) * 1000;
    return this.accessToken;
  }
}
