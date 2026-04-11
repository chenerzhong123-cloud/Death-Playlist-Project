import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { AuthUser, PublicPlaylist, Song } from '../lib/api';

interface FriendsProps {
  user: AuthUser | null;
  myPlaylistId: string | null;
  playlistIntro: string;
  addedSongs: Song[];
  onGoBack: () => void;
}

function getDisplayName(fallback: string): string {
  const surname = localStorage.getItem('user_surname');
  const gender = localStorage.getItem('user_gender');
  return surname ? `${surname}${gender || '先生'}` : fallback;
}

function PlaylistCard({ fp, isMine }: { fp: PublicPlaylist; isMine?: boolean }) {
  const intro = fp.intro || '暂无简介';
  const truncatedIntro = intro.length > 24 ? intro.slice(0, 24) + '...' : intro;

  return (
    <div className="bg-black rounded-3xl overflow-hidden shadow-2xl border-2 border-white/15">
      <div className="p-4 flex flex-col items-center">
        <h2 className="text-[15px] font-bold">
          {fp.user.name}的死亡歌单
          {isMine && <span className="ml-2 text-xs text-white/30 font-normal">(我)</span>}
        </h2>
        <p className="text-[12px] text-white/60 italic mt-1.5">{truncatedIntro}</p>
      </div>

      <div className="px-4">
        {fp.songs.map((song, idx) => (
          <div key={`${fp.id}-${song.id}`} className="flex items-center" style={{ height: 54 }}>
            <img
              src={song.albumArt}
              alt={song.title}
              className="w-[44px] h-[44px] rounded-lg object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0 ml-3">
              <div className="text-[15px] font-semibold truncate">{song.title}</div>
              <div className="text-[12px] text-white/60 truncate">{song.artist}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-white/60">死亡歌单</div>
          <div className="text-[8px] text-white/30 italic">定义自己生命的最后乐章</div>
        </div>
      </div>
    </div>
  );
}

export function Friends({ user, myPlaylistId, playlistIntro, addedSongs, onGoBack }: FriendsProps) {
  const [publicPlaylists, setPublicPlaylists] = useState<PublicPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/playlists/public');
      setPublicPlaylists(data);
    } catch {
      setPublicPlaylists([]);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  // Trigger load on first render
  if (!loaded && !loading) {
    loadPlaylists();
  }

  const displayName = getDisplayName(user?.nickname || '用户');

  const myCard: PublicPlaylist | null = user && myPlaylistId && addedSongs.length > 0
    ? { id: myPlaylistId, intro: playlistIntro, user: { id: user.id, name: displayName, avatar: user.avatar }, songs: addedSongs }
    : null;

  const hasMine = !!myCard;

  return (
    <motion.main
      key="friends"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="relative z-10 flex flex-col h-screen max-w-lg mx-auto bg-black overflow-hidden"
    >
      <header className="p-4 border-b border-white/10 flex items-center gap-3 sticky top-0 z-20 bg-black">
        <button
          onClick={onGoBack}
          className="p-1 -ml-1 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold tracking-tight">朋友们的歌单</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-4 pb-8">
        {loading ? (
          <div className="py-12 text-center text-white/30 text-sm">加载中...</div>
        ) : !hasMine && publicPlaylists.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-20 h-20 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-3xl opacity-30">
              🪦
            </div>
            <div className="text-center space-y-2">
              <p className="text-white/30 text-sm">还没有人创建歌单</p>
              <p className="text-white/30 text-xs">成为第一个定义自己生命最后乐章的人</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* My playlist — pinned at top */}
            {myCard && <PlaylistCard fp={myCard} isMine />}

            {/* Other playlists */}
            {publicPlaylists.map((fp) => (
              <PlaylistCard key={fp.id} fp={fp} />
            ))}
          </div>
        )}
      </div>
    </motion.main>
  );
}
