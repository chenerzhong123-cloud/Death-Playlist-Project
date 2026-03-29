import { Module } from '@nestjs/common';
import { ShareController } from './share.controller';
import { ShareService } from './share.service';
import { PlaylistsModule } from '../playlists/playlists.module';

@Module({
  imports: [PlaylistsModule],
  controllers: [ShareController],
  providers: [ShareService],
})
export class ShareModule {}
