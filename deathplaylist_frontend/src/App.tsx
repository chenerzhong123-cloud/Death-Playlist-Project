/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useRef } from 'react';
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
import type { Song, PublicPlaylist } from './lib/api';
import { analytics } from './lib/analytics';

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

function getDisplayName(fallback: string): string {
  const surname = localStorage.getItem('user_surname');
  const gender = localStorage.getItem('user_gender');
  return surname ? `${surname}${gender || '先生'}` : fallback;
}

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [toast, setToast] = useState<string | null>(null);
  const suggestedIntro = useMemo(() => randomIntro(), []);

  // Read-only playlist viewing from URL params
  const [viewingPlaylist, setViewingPlaylist] = useState<PublicPlaylist | null>(null);
  const sharing = useRef(false);

  // Name/gender popup state
  const [showNamePopup, setShowNamePopup] = useState(false);
  const [surnameInput, setSurnameInput] = useState('');
  const [genderInput, setGenderInput] = useState<'先生' | '女士'>('先生');
  // Force re-render when name changes
  const [nameVersion, setNameVersion] = useState(0);

  const { user, setUser, authLoading, ensureUser } = useAuth();

  const {
    addedSongs, setAddedSongs, playlistIntro, setPlaylistIntro,
    myPlaylistId, playlistLoaded, loadMyPlaylist, savePlaylist,
  } = usePlaylist();

  // Load my playlist when user is ready
  useEffect(() => {
    if (user) loadMyPlaylist().catch(() => setToast('歌单加载失败，请重试'));
  }, [user?.id, loadMyPlaylist]);

  // Handle ?playlist=xxx URL param for direct playlist viewing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const playlistId = params.get('playlist');
    let active = true;
    if (playlistId) {
      (async () => {
        try {
          const playlist: PublicPlaylist = await apiFetch(`/playlists/${encodeURIComponent(playlistId)}`);
          if (!active) return;
          setViewingPlaylist(playlist);
          analytics.playlistViewed();
          setView('share');
        } catch {
          if (active) setToast('歌单不存在或暂时无法加载');
        }
      })();
    }
    return () => { active = false; };
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
    // Check if name is set — if not, show popup first
    if (!localStorage.getItem('user_surname')) {
      setSurnameInput('');
      setGenderInput('先生');
      setShowNamePopup(true);
      return;
    }
    await doShare();
  };

  const doShare = async () => {
    if (sharing.current) return;
    sharing.current = true;
    try {
      const currentUser = await ensureUser();
      const nickname = getDisplayName(currentUser.nickname);
      if (nickname !== currentUser.nickname) {
        const profile = await apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify({ nickname }) });
        setUser(profile);
      }
      await savePlaylist(playlistIntro || suggestedIntro, addedSongs);
      analytics.playlistCreated(addedSongs.length);
      setViewingPlaylist(null);
      setView('share');
    } catch {
      setToast('保存失败，请重试');
    } finally { sharing.current = false; }
  };

  const handleNameConfirm = async () => {
    if (!surnameInput.trim()) {
      setToast('请输入你的姓');
      return;
    }
    localStorage.setItem('user_surname', surnameInput.trim());
    localStorage.setItem('user_gender', genderInput);
    setShowNamePopup(false);
    setNameVersion(v => v + 1);
    await doShare();
  };

  if (!viewingPlaylist && (authLoading || (user && !playlistLoaded))) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/30 text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20 overflow-hidden relative">
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
            onFriends={() => { analytics.friendsViewed(); setView('friends'); }}
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
            userName={getDisplayName(user?.nickname || '用户')}
            playlistIntro={playlistIntro}
            suggestedIntro={suggestedIntro}
            addedSongs={addedSongs}
            onReorder={setAddedSongs}
            onGoBack={() => setView('selection')}
            onShare={handleShare}
          />
        )}

        {view === 'share' && (() => {
          const shareUserName = viewingPlaylist
            ? viewingPlaylist.user?.name || '用户'
            : getDisplayName(user?.nickname || '用户');
          return (
            <Share
              playlistId={viewingPlaylist?.id || myPlaylistId || ''}
              userName={shareUserName}
              playlistIntro={viewingPlaylist ? viewingPlaylist.intro : playlistIntro}
              suggestedIntro={suggestedIntro}
              addedSongs={viewingPlaylist ? viewingPlaylist.songs : addedSongs}
              isViewing={!!viewingPlaylist}
              onGoBack={() => {
                setViewingPlaylist(null);
                setView(viewingPlaylist ? 'landing' : 'preview');
                const url = new URL(window.location.href);
                url.searchParams.delete('playlist');
                window.history.replaceState({}, '', url.pathname + url.search + url.hash);
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

      {/* Name/Gender Popup — shown at App level when sharing without a name */}
      <AnimatePresence>
        {showNamePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-6"
            onClick={() => setShowNamePopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 rounded-3xl p-6 w-full max-w-xs space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-center">输入你的称呼</h3>
              <p className="text-xs text-white/60 text-center">用于在歌单卡片上显示</p>

              <div className="space-y-3">
                <input
                  type="text"
                  value={surnameInput}
                  onChange={(e) => setSurnameInput(e.target.value.replace(/\s/g, ''))}
                  placeholder="请输入你的姓"
                  maxLength={2}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/30 text-center text-lg"
                  autoFocus
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => setGenderInput('先生')}
                    className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                      genderInput === '先生'
                        ? 'bg-white text-black'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    先生
                  </button>
                  <button
                    onClick={() => setGenderInput('女士')}
                    className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                      genderInput === '女士'
                        ? 'bg-white text-black'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    女士
                  </button>
                </div>
              </div>

              <button
                onClick={handleNameConfirm}
                className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-white/90 transition-colors"
              >
                确认
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
