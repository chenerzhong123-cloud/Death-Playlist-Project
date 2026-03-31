/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Users, Heart, Music2, Settings, Search, X, Check, ArrowLeft, Trash2, Share2, Download, MessageCircle, Edit3, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';

// API Configuration
const API_BASE = 'https://express-19oq-240531-4-1417659746.sh.run.tcloudbase.com/api';

async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem('jwt');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...headers, ...(options?.headers as Record<string, string>) } });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

interface Song {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  album?: string;
  duration?: number;
}

interface AuthUser {
  id: string;
  nickname: string;
  avatar: string;
}

interface FriendPlaylist {
  id: string;
  name: string;
  avatar: string;
  intro: string;
  songs: Song[];
}

const MOCK_FRIENDS: FriendPlaylist[] = [
  {
    id: 'f1',
    name: '阿强',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    intro: '最后一程，想听点燥的，别哭。',
    songs: [
      { id: '1', title: 'Bohemian Rhapsody', artist: 'Queen', albumArt: 'https://picsum.photos/seed/queen/100/100' },
      { id: '2', title: 'Stairway to Heaven', artist: 'Led Zeppelin', albumArt: 'https://picsum.photos/seed/led/100/100' },
      { id: '8', title: 'Purple Rain', artist: 'Prince', albumArt: 'https://picsum.photos/seed/prince/100/100' },
    ],
  },
  {
    id: 'f2',
    name: '小雅',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    intro: '安静地离开，像风一样自由。',
    songs: [
      { id: '3', title: 'Imagine', artist: 'John Lennon', albumArt: 'https://picsum.photos/seed/lennon/100/100' },
      { id: '6', title: 'Yesterday', artist: 'The Beatles', albumArt: 'https://picsum.photos/seed/beatles/100/100' },
    ],
  },
  {
    id: 'f3',
    name: '老李',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=George',
    intro: '这辈子值了，下辈子再见。',
    songs: [
      { id: '4', title: 'Hotel California', artist: 'Eagles', albumArt: 'https://picsum.photos/seed/eagles/100/100' },
      { id: '5', title: 'Wish You Were Here', artist: 'Pink Floyd', albumArt: 'https://picsum.photos/seed/floyd/100/100' },
      { id: '10', title: 'Bridge Over Troubled Water', artist: 'Simon & Garfunkel', albumArt: 'https://picsum.photos/seed/simon/100/100' },
    ],
  },
];

export default function App() {
  const [view, setView] = useState<'landing' | 'selection' | 'preview' | 'share' | 'friends'>('landing');
  const [bgImage, setBgImage] = useState('https://images.unsplash.com/photo-1514525253361-bee8718a340b?auto=format&fit=crop&q=80&w=1920');
  
  // User Info
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [playlistIntro, setPlaylistIntro] = useState('');
  const [isEditingIntro, setIsEditingIntro] = useState(false);

  // Music Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addedSongs, setAddedSongs] = useState<Song[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // Player State
  const [playingSong, setPlayingSong] = useState<Song | null>(null);
  const [playProgress, setPlayProgress] = useState(0);

  // Auth State
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [authNickname, setAuthNickname] = useState('');

  // Auto-login on mount
  useEffect(() => {
    const doLogin = async () => {
      try {
        // Check stored JWT first
        const storedJwt = localStorage.getItem('jwt');
        if (storedJwt) {
          try {
            const profile = await apiFetch('/users/me');
            setUser({ id: profile.id, nickname: profile.nickname, avatar: profile.avatar });
            setAuthLoading(false);
            return;
          } catch {
            localStorage.removeItem('jwt');
          }
        }

        // Try wxCode from URL (passed by mini program)
        const params = new URLSearchParams(window.location.search);
        const wxCode = params.get('wxCode');
        if (wxCode) {
          try {
            const data = await apiFetch('/auth/wechat', {
              method: 'POST',
              body: JSON.stringify({ code: wxCode }),
            });
            localStorage.setItem('jwt', data.accessToken);
            setUser(data.user);
            // Clean URL parameter
            window.history.replaceState({}, '', window.location.pathname);
            setAuthLoading(false);
            return;
          } catch {
            // Code login failed, show popup
          }
        }

        // No auth available — show popup after brief delay
        setTimeout(() => setShowAuthPopup(true), 800);
      } finally {
        setAuthLoading(false);
      }
    };
    doLogin();
  }, []);

  const handleLogin = async () => {
    try {
      const nickname = authNickname.trim() || '微信用户';
      const data = await apiFetch('/auth/wechat', {
        method: 'POST',
        body: JSON.stringify({ code: `mock_${nickname}`, nickname }),
      });
      localStorage.setItem('jwt', data.accessToken);
      setUser(data.user);
      setShowAuthPopup(false);
      setToast('登录成功');
    } catch {
      setToast('登录失败，请重试');
    }
  };

  useEffect(() => {
    let interval: any;
    if (playingSong) {
      setPlayProgress(0);
      interval = setInterval(() => {
        setPlayProgress(prev => (prev >= 100 ? 0 : prev + 2));
      }, 200);
    }
    return () => clearInterval(interval);
  }, [playingSong]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Song search via backend API
  const searchSongs = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    try {
      const data = await apiFetch(`/songs/search?q=${encodeURIComponent(query)}&limit=20`);
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchSongs(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery, searchSongs]);

  const filteredSongs = searchLoading ? [] : (searchQuery.trim() ? searchResults : []);

  const toggleSong = (song: Song) => {
    setAddedSongs(prev => {
      const isAdded = prev.find(s => s.id === song.id);
      if (isAdded) {
        return prev.filter(s => s.id !== song.id);
      } else {
        if (prev.length >= 9) {
          setToast('最多只能添加9首音乐哦');
          return prev;
        }
        return [...prev, song];
      }
    });
  };

  const removeSong = (id: string) => {
    setAddedSongs(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20 overflow-hidden relative">
      {/* Background Image with Overlay */}
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

      {/* Auth Popup */}
      <AnimatePresence>
        {showAuthPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-zinc-900 border border-white/10 p-8 rounded-[32px] w-full max-w-xs text-center space-y-6 shadow-2xl"
            >
              <div className="w-16 h-16 bg-[#07C160] rounded-full flex items-center justify-center mx-auto mb-2">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">设置昵称</h3>
                <p className="text-sm text-white/60">输入你的昵称开始使用</p>
              </div>
              <input
                type="text"
                value={authNickname}
                onChange={(e) => setAuthNickname(e.target.value)}
                placeholder="输入昵称"
                maxLength={15}
                className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-center text-sm outline-none focus:border-white/40"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={handleLogin}
                  className="w-full bg-[#07C160] text-white py-3.5 rounded-2xl font-bold text-lg active:scale-95 transition-transform"
                >
                  开始使用
                </button>
                <button
                  onClick={() => setShowAuthPopup(false)}
                  className="w-full bg-white/5 text-white/40 py-3 rounded-2xl font-medium active:scale-95 transition-transform"
                >
                  暂不登录
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
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
          <motion.main
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -20 }}
            className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center max-w-lg mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-8"
            >
              {/* Header */}
              <div className="space-y-4">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="inline-flex items-center justify-center w-24 h-24 mb-4 border border-white/20 rounded-full backdrop-blur-sm bg-white/5"
                >
                  {/* Wireframe Icon Style */}
                  <Music2 className="w-12 h-12 text-white/80" strokeWidth={1} />
                </motion.div>
                
                <h1 className="text-5xl font-bold tracking-tighter sm:text-6xl italic serif">
                  死亡歌单
                </h1>
                
                <p className="text-lg text-white/70 font-light leading-relaxed max-w-xs mx-auto">
                  不想自己的葬礼还在吹唢呐放哀乐？
                  <br />
                  选择你的葬礼上播放的音乐吧
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-4 w-full pt-8">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setView('selection')}
                  className="flex items-center justify-center gap-3 bg-white text-black py-4 px-8 rounded-2xl font-semibold text-lg transition-colors hover:bg-white/90"
                >
                  新的歌单
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setView('friends')}
                  className="flex items-center justify-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 text-white py-4 px-8 rounded-2xl font-semibold text-lg transition-colors hover:bg-white/20"
                >
                  <Users className="w-5 h-5" />
                  看朋友们的歌单
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center gap-3 bg-transparent border border-white/30 text-white/80 py-4 px-8 rounded-2xl font-medium text-lg transition-colors hover:bg-white/10"
                >
                  <Heart className="w-5 h-5" />
                  点赞投币
                </motion.button>
              </div>
            </motion.div>
          </motion.main>
        )}

        {view === 'selection' && (
          <motion.main
            key="selection"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="relative z-10 flex flex-col h-screen max-w-2xl mx-auto bg-black/40 backdrop-blur-xl border-x border-white/5 overflow-hidden"
          >
            {/* Selection Header */}
            <header className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 z-20 bg-black/40 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    setPlayingSong(null);
                    setView('landing');
                  }}
                  className="p-1 -ml-1 text-white/60 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold tracking-tight">定制你的歌单</h2>
              </div>
              <button 
                onClick={() => {
                  if (addedSongs.length > 0) {
                    setPlayingSong(null);
                    setView('preview');
                  } else {
                    setToast('请先添加至少一首歌曲');
                  }
                }}
                className="bg-white text-black px-4 py-1.5 rounded-full text-sm font-bold hover:bg-white/90 transition-colors"
              >
                完成
              </button>
            </header>

            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Search Bar */}
              <div className="px-4 py-2">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-white/60 transition-colors" />
                  <input 
                    type="text"
                    placeholder="搜索歌曲"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:bg-white/10 focus:border-white/20 transition-all text-sm"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Search Results (Upper Part) */}
              <div className="flex-1 overflow-y-auto px-3 space-y-1 border-b border-white/5">
                {filteredSongs.length === 0 ? (
                  <div className="py-10 text-center text-white/20 text-xs">
                    未找到相关歌曲
                  </div>
                ) : (
                  filteredSongs.map((song) => {
                    const isAdded = addedSongs.find(s => s.id === song.id);
                    return (
                      <motion.div 
                        layout
                        key={song.id}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group"
                      >
                        <img 
                          src={song.albumArt} 
                          alt={song.title} 
                          className="w-10 h-10 rounded-lg object-cover shadow-md bg-zinc-800"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate text-sm">{song.title}</h3>
                          <p className="text-[11px] text-white/40 truncate">{song.artist}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setPlayingSong(playingSong?.id === song.id ? null : song)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border ${
                              playingSong?.id === song.id 
                                ? 'bg-white/20 border-white text-white' 
                                : 'bg-transparent border-white/10 text-white/30 hover:border-white/40 hover:text-white'
                            }`}
                          >
                            {playingSong?.id === song.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                          </button>
                          <button 
                            onClick={() => toggleSong(song)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border ${
                              isAdded 
                                ? 'bg-white border-white text-black' 
                                : 'bg-transparent border-white/20 text-white/40 hover:border-white/40 hover:text-white'
                            }`}
                          >
                            {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Added Songs (Lower Part) */}
              <div className="h-1/3 bg-zinc-950/50 backdrop-blur-3xl flex flex-col border-t border-white/10 shrink-0">
                <div className="px-4 py-2 flex justify-between items-center sticky top-0 bg-zinc-950/80 z-10">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">
                    已添加 ({addedSongs.length}/9)
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
                  {addedSongs.length === 0 ? (
                    <div className="py-6 text-center text-white/10 text-xs italic">
                      点击上方按钮添加歌曲
                    </div>
                  ) : (
                    addedSongs.map((song) => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={`added-${song.id}`}
                        className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5"
                      >
                        <img 
                          src={song.albumArt} 
                          alt={song.title} 
                          className="w-8 h-8 rounded-md object-cover bg-zinc-800"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate text-xs">{song.title}</h3>
                          <p className="text-[10px] text-white/30 truncate">{song.artist}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setPlayingSong(playingSong?.id === song.id ? null : song)}
                            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                              playingSong?.id === song.id 
                                ? 'bg-white/20 text-white' 
                                : 'text-white/20 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {playingSong?.id === song.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                          </button>
                          <button 
                            onClick={() => removeSong(song.id)}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>

              {/* Mini Player */}
              <AnimatePresence>
                {playingSong && (
                  <motion.div
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    exit={{ y: 100 }}
                    className="bg-zinc-900/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 flex flex-col gap-2 z-30"
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={playingSong.albumArt} 
                        className="w-10 h-10 rounded-lg shadow-lg animate-pulse" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{playingSong.title}</div>
                        <div className="text-[10px] text-white/40 truncate uppercase tracking-wider">{playingSong.artist}</div>
                      </div>
                      <button 
                        onClick={() => setPlayingSong(null)}
                        className="p-2 text-white/40 hover:text-white"
                      >
                        <Pause className="w-5 h-5" />
                      </button>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-white"
                        initial={{ width: '0%' }}
                        animate={{ width: `${playProgress}%` }}
                        transition={{ duration: 0.2, ease: "linear" }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.main>
        )}

        {view === 'preview' && (
          <motion.main
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 flex flex-col h-screen max-w-2xl mx-auto bg-black/60 backdrop-blur-2xl overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-8 pt-16 pb-32 space-y-8">
              {/* Preview Header */}
              <div className="text-center space-y-4">
                <h1 className="text-3xl font-bold tracking-tight italic serif">
                  {user?.nickname || '用户'}的死亡歌单
                </h1>
                <div className="relative inline-block w-full max-w-xs">
                  {isEditingIntro ? (
                    <input 
                      autoFocus
                      type="text"
                      maxLength={15}
                      value={playlistIntro}
                      onChange={(e) => setPlaylistIntro(e.target.value)}
                      onBlur={() => setIsEditingIntro(false)}
                      onKeyDown={(e) => e.key === 'Enter' && setIsEditingIntro(false)}
                      className="w-full bg-white/10 border-b border-white/30 py-2 text-center outline-none text-white/90"
                    />
                  ) : (
                    <button 
                      onClick={() => setIsEditingIntro(true)}
                      className="flex items-center justify-center gap-2 w-full py-2 text-white/50 hover:text-white/80 transition-colors"
                    >
                      <span className="italic">{playlistIntro || '点击输入简介，15字以内'}</span>
                      <Edit3 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Preview Songs List */}
              <div className="space-y-2">
                <div className="flex justify-end px-2">
                  <span className="text-[10px] text-white/30">长按歌曲排序</span>
                </div>
                
                <Reorder.Group
                  axis="y"
                  values={addedSongs}
                  onReorder={setAddedSongs}
                  className="space-y-1"
                >
                  {addedSongs.map((song, idx) => (
                    <Reorder.Item
                      key={song.id}
                      value={song}
                      className="flex items-center gap-4 py-2 px-4 rounded-xl hover:bg-white/5 transition-colors cursor-grab active:cursor-grabbing"
                    >
                      <div className="text-sm font-mono text-white/20 w-6">{String(idx + 1).padStart(2, '0')}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate text-sm">{song.title}</h3>
                        <p className="text-[11px] text-white/40 truncate">{song.artist}</p>
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>
            </div>

            {/* Preview Footer */}
            <footer className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black to-transparent flex gap-4">
              <button 
                onClick={() => setView('selection')}
                className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 py-4 rounded-2xl font-bold transition-colors hover:bg-white/20"
              >
                上一步
              </button>
              <button 
                onClick={() => setView('share')}
                className="flex-1 bg-white text-black py-4 rounded-2xl font-bold transition-colors hover:bg-white/90"
              >
                分享预览
              </button>
            </footer>
          </motion.main>
        )}

        {view === 'share' && (
          <motion.main
            key="share"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex flex-col items-center h-screen max-w-2xl mx-auto bg-black/90 backdrop-blur-3xl overflow-y-auto pt-12 pb-24 px-6"
          >
            {/* Share Card */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-[340px] bg-zinc-900 border-[12px] border-white/10 rounded-[40px] overflow-hidden shadow-2xl relative flex flex-col shrink-0"
            >
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover' }} />
              
              {/* Card Content - Matching Preview Page */}
              <div className="relative p-8 flex flex-col space-y-6">
                <div className="text-center space-y-3">
                  <h2 className="text-2xl font-bold italic serif">{user?.nickname || '用户'}的死亡歌单</h2>
                  <p className="text-xs text-white/70 italic px-4 leading-relaxed">{playlistIntro || '暂无简介'}</p>
                </div>
                
                <div className="space-y-1">
                  {addedSongs.map((song, idx) => (
                    <div key={`share-full-${song.id}`} className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0">
                      <div className="text-[10px] font-mono text-white/20 w-5">{String(idx + 1).padStart(2, '0')}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{song.title}</div>
                        <div className="text-[10px] text-white/40 truncate">{song.artist}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lower Border Area with QR Code */}
              <div className="relative bg-white/5 p-6 border-t border-white/10 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">死亡歌单</div>
                  <div className="text-[8px] text-white/20 italic">扫码查看完整歌单</div>
                </div>
                <div className="w-16 h-16 bg-white p-1 rounded-xl shadow-lg shrink-0">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.href)}`} 
                    alt="QR Code" 
                    className="w-full h-full"
                  />
                </div>
              </div>
            </motion.div>

            {/* Share Actions */}
            <div className="mt-8 w-full max-w-[340px] space-y-4 shrink-0">
              <div className="flex gap-4">
                <button 
                  onClick={() => setToast('已保存到相册')}
                  className="flex-1 flex flex-col items-center gap-2 p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  <span className="text-[10px]">保存</span>
                </button>
                <button 
                  onClick={() => setToast('正在打开微信...')}
                  className="flex-1 flex flex-col items-center gap-2 p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-[10px]">微信好友</span>
                </button>
              </div>
              <button 
                onClick={() => setView('preview')}
                className="w-full py-2 text-white/40 hover:text-white transition-colors text-xs"
              >
                返回预览
              </button>
            </div>
          </motion.main>
        )}

        {view === 'friends' && (
          <motion.main
            key="friends"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="relative z-10 flex flex-col h-screen max-w-2xl mx-auto bg-black/40 backdrop-blur-xl border-x border-white/5 overflow-hidden"
          >
            <header className="p-4 border-b border-white/10 flex items-center gap-3 sticky top-0 z-20 bg-black/40 backdrop-blur-md">
              <button 
                onClick={() => setView('landing')}
                className="p-1 -ml-1 text-white/60 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold tracking-tight">朋友们的歌单</h2>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-8">
              {MOCK_FRIENDS.map((friend) => (
                <motion.div 
                  key={friend.id}
                  className="bg-white/5 border border-white/10 rounded-[32px] p-6 space-y-6"
                >
                  <div className="flex items-center gap-4">
                    <img src={friend.avatar} alt={friend.name} className="w-12 h-12 rounded-full bg-white/10" />
                    <div>
                      <h3 className="font-bold text-lg">{friend.name}的死亡歌单</h3>
                      <p className="text-sm text-white/50 italic">“{friend.intro}”</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {friend.songs.map((song) => (
                      <div key={`${friend.id}-${song.id}`} className="flex items-center gap-3 bg-black/40 p-3 rounded-2xl">
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
              <div className="py-12 text-center text-white/20 text-xs">没有更多朋友的歌单了</div>
            </div>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}
