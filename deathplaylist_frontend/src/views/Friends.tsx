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

  const myCard: PublicPlaylist | null = user && myPlaylistId && addedSongs.length > 0
    ? { id: myPlaylistId, intro: playlistIntro, user: { id: user.id, name: user.nickname, avatar: user.avatar }, songs: addedSongs }
    : null;

  const allPlaylists = myCard ? [myCard, ...publicPlaylists] : publicPlaylists;

  return (
    <motion.main
      key="friends"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="relative z-10 flex flex-col h-screen max-w-2xl mx-auto bg-black/40 backdrop-blur-xl border-x border-white/5 overflow-hidden"
    >
      <header className="p-4 border-b border-white/10 flex items-center gap-3 sticky top-0 z-20 bg-black/40 backdrop-blur-md">
        <button
          onClick={onGoBack}
          className="p-1 -ml-1 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold tracking-tight">朋友们的歌单</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        {loading ? (
          <div className="py-12 text-center text-white/30 text-sm">加载中...</div>
        ) : allPlaylists.length === 0 ? (
          <div className="py-12 text-center text-white/20 text-xs">
            还没有人创建歌单
            <br />
            <span className="text-white/10">成为第一个创建死亡歌单的人吧</span>
          </div>
        ) : allPlaylists.map((fp) => (
            <motion.div
              key={fp.id}
              className="bg-white/5 border border-white/10 rounded-[32px] p-6 space-y-6"
            >
              <div className="flex items-center gap-4">
                <img src={fp.user.avatar} alt={fp.user.name} className="w-12 h-12 rounded-full bg-white/10" />
                <div>
                  <h3 className="font-bold text-lg">
                    {fp.user.name}的死亡歌单
                    {myCard && fp.id === myCard.id && <span className="ml-2 text-xs text-white/30 font-normal">(我)</span>}
                  </h3>
                  <p className="text-sm text-white/50 italic">"{fp.intro || '暂无简介'}"</p>
                </div>
              </div>
              <div className="space-y-2">
                {fp.songs.map((song) => (
                  <div key={`${fp.id}-${song.id}`} className="flex items-center gap-3 bg-black/40 p-3 rounded-2xl">
                    <img src={song.albumArt} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{song.title}</div>
                      <div className="text-[10px] text-white/40 truncate">{song.artist}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
      </div>
    </motion.main>
  );
}
