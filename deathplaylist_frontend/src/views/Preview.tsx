import { motion, Reorder } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import type { Song } from '../lib/api';

interface PreviewProps {
  userName: string;
  playlistIntro: string;
  suggestedIntro: string;
  addedSongs: Song[];
  onReorder: (songs: Song[]) => void;
  onGoBack: () => void;
  onShare: () => void;
}

export function Preview({ userName, playlistIntro, suggestedIntro, addedSongs, onReorder, onGoBack, onShare }: PreviewProps) {
  return (
    <motion.main
      key="preview"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative z-10 flex flex-col h-screen max-w-lg mx-auto bg-black/60 backdrop-blur-2xl overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto px-8 pt-16 pb-32 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight italic serif">
            {userName}的死亡歌单
          </h1>
          <p className="text-sm text-white/60 italic">
            {playlistIntro || suggestedIntro}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-end px-2">
            <span className="text-[10px] text-white/30">长按歌曲排序</span>
          </div>

          <Reorder.Group
            axis="y"
            values={addedSongs}
            onReorder={onReorder}
            className="space-y-1"
          >
            {addedSongs.map((song, idx) => (
              <Reorder.Item
                key={song.id}
                value={song}
                className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors cursor-grab active:cursor-grabbing"
              >
                <div className="text-sm font-mono text-white/30 w-5">{String(idx + 1).padStart(2, '0')}</div>
                <img
                  src={song.albumArt || undefined}
                  alt={song.title}
                  className="w-10 h-10 rounded-lg object-cover bg-zinc-800 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate text-sm">{song.title}</h3>
                  <p className="text-[11px] text-white/60 truncate">{song.artist}</p>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
      </div>

      <footer className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black to-transparent flex gap-4">
        <button
          onClick={onGoBack}
          className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 py-4 rounded-2xl font-bold transition-colors hover:bg-white/20"
        >
          上一步
        </button>
        <button
          onClick={onShare}
          className="flex-1 bg-white text-black py-4 rounded-2xl font-bold transition-colors hover:bg-white/90"
        >
          分享预览
        </button>
      </footer>
    </motion.main>
  );
}
