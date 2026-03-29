import { Injectable } from '@nestjs/common';
import { PlaylistsService } from '../playlists/playlists.service';

@Injectable()
export class ShareService {
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
}
