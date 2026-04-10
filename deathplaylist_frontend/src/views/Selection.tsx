import { motion } from 'motion/react';
import { ArrowLeft, Plus, X } from 'lucide-react';
import type { Song } from '../lib/api';

interface SelectionProps {
  addedSongs: Song[];
  onGoBack: () => void;
  onAddSong: () => void;
  onRemoveSong: (id: string) => void;
  onComplete: () => void;
}

export function Selection({ addedSongs, onGoBack, onAddSong, onRemoveSong, onComplete }: SelectionProps) {
  return (
    <motion.main
      key="selection"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="relative z-10 flex flex-col h-screen max-w-2xl mx-auto bg-black/40 backdrop-blur-xl border-x border-white/5 overflow-hidden"
    >
      <header className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 z-20 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onGoBack}
            className="p-1 -ml-1 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold tracking-tight">我的死亡歌单</h2>
        </div>
        <button
          onClick={onComplete}
          className="bg-white text-black px-4 py-1.5 rounded-full text-sm font-bold hover:bg-white/90 transition-colors"
        >
          完成
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 px-2 mb-3">
          已添加 ({addedSongs.length}/9)
        </div>

        {/* Filled slots */}
        {addedSongs.map((song) => (
          <motion.div
            key={song.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5"
          >
            <img
              src={song.albumArt}
              alt={song.title}
              className="w-10 h-10 rounded-lg object-cover bg-zinc-800 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate text-sm">{song.title}</h3>
              <p className="text-[11px] text-white/40 truncate">{song.artist}</p>
            </div>
            <button
              onClick={() => onRemoveSong(song.id)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}

        {/* Empty slots / Add button */}
        {addedSongs.length < 9 && (
          <button
            onClick={onAddSong}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-white/20 transition-colors text-white/30 hover:text-white/50"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm">添加歌曲</span>
          </button>
        )}

        {addedSongs.length > 0 && (
          <div className="text-center text-white/10 text-[10px] pt-2">
            最多添加9首歌曲
          </div>
        )}
      </div>
    </motion.main>
  );
}
