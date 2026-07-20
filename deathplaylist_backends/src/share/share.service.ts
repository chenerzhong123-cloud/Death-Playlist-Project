import { Injectable } from '@nestjs/common';
import { PlaylistsService } from '../playlists/playlists.service';

@Injectable()
export class ShareService {
  constructor(private playlistsService: PlaylistsService) {}

  async getShareData(playlistId: string, baseUrl: string) {
    const playlist = await this.playlistsService.findById(playlistId);
    const formatted = this.playlistsService.formatPlaylist(playlist);

    const shareUrl = `${baseUrl}/deathplaylist/?playlist=${playlistId}`;
    return {
      ...formatted,
      shareUrl,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareUrl)}`,
    };
  }

  async getQRCode(playlistId: string, baseUrl: string): Promise<Buffer> {
    const shareUrl = `${baseUrl}/deathplaylist/?playlist=${playlistId}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&color=ffffff&bgcolor=0&format=png&data=${encodeURIComponent(shareUrl)}`;
    const res = await fetch(qrUrl);
    return Buffer.from(await res.arrayBuffer());
  }
}
