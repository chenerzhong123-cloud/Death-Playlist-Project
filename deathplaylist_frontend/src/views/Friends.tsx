import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { AuthUser, FriendPlaylist, Song } from '../lib/api';

interface FriendsProps {
  user: AuthUser | null;
  myPlaylistId: string | null;
  playlistIntro: string;
  addedSongs: Song[];
  onGoBack: () => void;
  onLogin: () => void;
}

const DEMO_SONGS = [
  { title: 'Bohemian Rhapsody', artist: 'Queen', albumArt: 'https://picsum.photos/seed/queen/100/100' },
  { title: 'Imagine', artist: 'John Lennon', albumArt: 'https://picsum.photos/seed/lennon/100/100' },
  { title: 'Hotel California', artist: 'Eagles', albumArt: 'https://picsum.photos/seed/eagles/100/100' },
];

export function Friends({ user, myPlaylistId, playlistIntro, addedSongs, onGoBack, onLogin }: FriendsProps) {
  const [friendsPlaylists, setFriendsPlaylists] = useState<FriendPlaylist[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadFriends = async () => {
    setFriendsLoading(true);
    try {
      const data = await apiFetch('/playlists/friends');
      setFriendsPlaylists(data);
    } catch {
      setFriendsPlaylists([]);
    } finally {
      setFriendsLoading(false);
      setLoaded(true);
    }
  };

  const handleEnter = () => {
    if (user) {
      loadFriends();
    } else {
      setLoaded(true);
    }
  };

  // Trigger load on first render
  if (!loaded && !friendsLoading) {
    handleEnter();
  }

  const myCard: FriendPlaylist | null = user && myPlaylistId && addedSongs.length > 0
    ? { id: myPlaylistId, intro: playlistIntro, user: { id: user.id, name: user.nickname, avatar: user.avatar }, songs: addedSongs }
    : null;

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
        {friendsLoading ? (
          <div className="py-12 text-center text-white/30 text-sm">加载中...</div>
        ) : !user ? (
          <>
            {/* Guest: demo card */}
            <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 space-y-6">
              <div className="flex items-center gap-4">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Demo" alt="示例用户" className="w-12 h-12 rounded-full bg-white/10" />
                <div>
                  <h3 className="font-bold text-lg">示例用户的死亡歌单</h3>
                  <p className="text-sm text-white/50 italic">"最后一程，听点自己喜欢的。"</p>
                </div>
              </div>
              <div className="space-y-2">
                {DEMO_SONGS.map((song, i) => (
                  <div key={i} className="flex items-center gap-3 bg-black/40 p-3 rounded-2xl">
                    <img src={song.albumArt} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{song.title}</div>
                      <div className="text-[10px] text-white/40 truncate">{song.artist}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center pt-4 space-y-3">
              <p className="text-white/30 text-xs">登录后查看更多朋友的歌单</p>
              <button
                onClick={onLogin}
                className="bg-white text-black px-8 py-3 rounded-2xl font-bold active:scale-95 transition-transform"
              >
                登录查看更多
              </button>
            </div>
          </>
        ) : (() => {
          const allPlaylists = myCard ? [myCard, ...friendsPlaylists] : friendsPlaylists;
          if (allPlaylists.length === 0) {
            return (
              <div className="py-12 text-center text-white/20 text-xs">
                还没有朋友的歌单
                <br />
                <span className="text-white/10">分享你的歌单给朋友，让他们也创建一份吧</span>
              </div>
            );
          }
          return allPlaylists.map((fp) => (
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
          ));
        })()}
      </div>
    </motion.main>
  );
}
