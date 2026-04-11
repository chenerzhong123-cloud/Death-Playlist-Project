import { Module } from '@nestjs/common';
import { ShareController, UtilsController } from './share.controller';
import { ShareService } from './share.service';
import { PlaylistsModule } from '../playlists/playlists.module';

@Module({
  imports: [PlaylistsModule],
  controllers: [ShareController, UtilsController],
  providers: [ShareService],
})
export class ShareModule {}
