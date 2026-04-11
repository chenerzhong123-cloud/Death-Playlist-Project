/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './hooks/useAuth';
import { usePlaylist } from './hooks/usePlaylist';
import { Landing } from './views/Landing';
import { Selection } from './views/Selection';
import { Picker } from './views/Picker';
import { Preview } from './views/Preview';
import { Share } from './views/Share';
import { Friends } from './views/Friends';
import { apiFetch } from './lib/api';
import type { Song } from './lib/api';

const INTRO_SUGGESTIONS = [
  '给你的人生，留最后一句话',
  '如果这是你最后的BGM',
  '葬礼上，我要放这首歌',
  '离开时，请为我播放',
  '闭上眼之前，听一首',
  '我的告别，由我配乐',
  '人生最后一首，我选好了',
  '当我离去，音乐代替遗言',
  '走的时候，别放哀乐',
  '这是我最后的倔强',
  '如果明天不再来',
  '人生谢幕，歌单已定',
  '让音乐替我说再见',
  '世界最后的旋律，由我定',
  '我选好了，你们播就好',
];

const randomIntro = () => INTRO_SUGGESTIONS[Math.floor(Math.random() * INTRO_SUGGESTIONS.length)];

type View = 'landing' | 'selection' | 'picker' | 'preview' | 'share' | 'friends';

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [bgImage] = useState('https://images.unsplash.com/photo-1514525253361-bee871871a340b?auto=format&fit=crop&q=80&w=1920');
  const [toast, setToast] = useState<string | null>(null);
  const suggestedIntro = useMemo(() => randomIntro(), []);

  // Read-only playlist viewing from URL params
  const [viewingPlaylistId, setViewingPlaylistId] = useState<string | null>(null);
  const [viewingUserName, setViewingUserName] = useState<string>('用户');

  const { user, setUser, authLoading } = useAuth();

  const {
    addedSongs, setAddedSongs, playlistIntro, setPlaylistIntro,
    myPlaylistId, loadMyPlaylist, savePlaylist,
  } = usePlaylist();

  // Load my playlist when user is ready
  useEffect(() => {
    if (user) loadMyPlaylist();
  }, [user]);

  // Handle ?playlist=xxx URL param for direct playlist viewing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const playlistId = params.get('playlist');
    if (playlistId) {
      window.history.replaceState({}, '', window.location.pathname);
      (async () => {
        try {
          const playlist = await apiFetch(`/playlists/${playlistId}`);
          setAddedSongs(playlist.songs.map((s: any) => ({
            id: s.id, title: s.title, artist: s.artist, albumArt: s.albumArt,
          })));
          setPlaylistIntro(playlist.intro || '');
          setViewingPlaylistId(playlistId);
          setViewingUserName(playlist.user?.name || '用户');
          setView('share');
        } catch {
          setToast('歌单不存在');
        }
      })();
    }
  }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const toggleSong = (song: Song) => {
    setAddedSongs(prev => {
      const isAdded = prev.find(s => s.id === song.id);
      if (isAdded) return prev.filter(s => s.id !== song.id);
      if (prev.length >= 9) {
        setToast('最多只能添加9首音乐哦');
        return prev;
      }
      return [...prev, song];
    });
  };

  const removeSong = (id: string) => {
    setAddedSongs(prev => prev.filter(s => s.id !== id));
  };

  const handleComplete = () => {
    if (addedSongs.length === 0) {
      setToast('请先添加至少一首歌曲');
      return;
    }
    setView('preview');
  };

  const handleShare = async () => {
    try {
      await savePlaylist(playlistIntro || suggestedIntro, addedSongs);
      setViewingPlaylistId(null);
      setView('share');
    } catch {
      setToast('保存失败，请重试');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/30 text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20 overflow-hidden relative">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0 transition-all duration-1000 ease-in-out"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black" />
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-white text-black px-6 py-3 rounded-full font-semibold shadow-2xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <Landing
            hasPlaylist={!!myPlaylistId && addedSongs.length > 0}
            onNewPlaylist={() => setView('selection')}
            onFriends={() => setView('friends')}
          />
        )}

        {view === 'selection' && (
          <Selection
            addedSongs={addedSongs}
            onGoBack={() => setView('landing')}
            onAddSong={() => setView('picker')}
            onRemoveSong={removeSong}
            onComplete={handleComplete}
          />
        )}

        {view === 'picker' && (
          <Picker
            addedSongs={addedSongs}
            onGoBack={() => setView('selection')}
            onSelect={(song) => {
              if (addedSongs.length >= 9) {
                setToast('最多只能添加9首音乐哦');
                return;
              }
              setAddedSongs(prev => [...prev, song]);
              setView('selection');
            }}
            onToggle={toggleSong}
            onToast={setToast}
          />
        )}

        {view === 'preview' && (
          <Preview
            userName={user?.nickname || '用户'}
            playlistIntro={playlistIntro}
            suggestedIntro={suggestedIntro}
            addedSongs={addedSongs}
            onReorder={setAddedSongs}
            onGoBack={() => setView('selection')}
            onShare={handleShare}
          />
        )}

        {view === 'share' && (() => {
          const storedSurname = localStorage.getItem('user_surname');
          const storedGender = localStorage.getItem('user_gender');
          const shareUserName = viewingPlaylistId
            ? viewingUserName
            : (storedSurname ? `${storedSurname}${storedGender || '先生'}` : (user?.nickname || '用户'));
          return (
            <Share
            playlistId={viewingPlaylistId || myPlaylistId || ''}
            userName={shareUserName}
            playlistIntro={playlistIntro}
            suggestedIntro={suggestedIntro}
            addedSongs={addedSongs}
            bgImage={bgImage}
            isViewing={!!viewingPlaylistId}
            onGoBack={() => {
              setViewingPlaylistId(null);
              setView(viewingPlaylistId ? 'landing' : 'preview');
            }}
            onToast={setToast}
          />
          );
        })()}

        {view === 'friends' && (
          <Friends
            user={user}
            myPlaylistId={myPlaylistId}
            playlistIntro={playlistIntro}
            addedSongs={addedSongs}
            onGoBack={() => setView('landing')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
