import { motion } from 'motion/react';
import { Plus, Check, X } from 'lucide-react';
import type { Song } from '../lib/api';

interface SongRowProps {
  song: Song;
  isAdded?: boolean;
  variant: 'search' | 'added';
  onToggle?: () => void;
  onRemove?: () => void;
}

export function SongRow({ song, isAdded, variant, onToggle, onRemove }: SongRowProps) {
  if (variant === 'added') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5"
      >
        <img
          src={song.albumArt || undefined}
          alt={song.title}
          className="w-8 h-8 rounded-md object-cover bg-zinc-800"
          referrerPolicy="no-referrer"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate text-xs">{song.title}</h3>
          <p className="text-[10px] text-white/60 truncate">{song.artist}</p>
        </div>
        <button
          onClick={onRemove}
          className="w-7 h-7 rounded-md flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group"
    >
      <img
        src={song.albumArt || undefined}
        alt={song.title}
        className="w-10 h-10 rounded-lg object-cover shadow-md bg-zinc-800"
        referrerPolicy="no-referrer"
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold truncate text-sm">{song.title}</h3>
        <p className="text-[11px] text-white/60 truncate">{song.artist}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border ${
            isAdded
              ? 'bg-white border-white text-black'
              : 'bg-transparent border-white/20 text-white/60 hover:border-white/40 hover:text-white'
          }`}
        >
          {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>
    </motion.div>
  );
}
