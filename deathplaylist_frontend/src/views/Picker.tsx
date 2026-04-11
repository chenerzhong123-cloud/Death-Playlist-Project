import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Search, X, Plus, Check } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useRecommend } from '../hooks/useRecommend';
import type { Song } from '../lib/api';

interface PickerProps {
  addedSongs: Song[];
  onGoBack: () => void;
  onSelect: (song: Song) => void;
  onToggle: (song: Song) => void;
  onToast: (msg: string) => void;
}

const PAGE_SIZE = 20;

export function Picker({ addedSongs, onGoBack, onSelect, onToggle, onToast }: PickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const loadMoreRef = useRef(false);
  const { recommendedSongs } = useRecommend();
  const scrollRef = useRef<HTMLDivElement>(null);

  const searchSongs = useCallback(async (query: string, offset: number, append: boolean) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      setHasMore(false);
      return;
    }
    if (offset === 0) setSearchLoading(true);
    loadMoreRef.current = true;
    try {
      const data = await apiFetch(`/songs/search?q=${encodeURIComponent(query)}&limit=${PAGE_SIZE}&offset=${offset}`);
      if (append) {
        const existingIds = new Set(searchResults.map(s => s.id));
        const newSongs = data.filter((s: Song) => !existingIds.has(s.id));
        if (newSongs.length === 0) {
          setHasMore(false);
        } else {
          setSearchResults(prev => [...prev, ...newSongs]);
        }
        setHasMore(newSongs.length > 0 && data.length >= PAGE_SIZE);
      } else {
        setSearchResults(data);
        setHasMore(data.length >= PAGE_SIZE);
      }
      setCurrentOffset(offset + data.length);
    } catch {
      if (!append) setSearchResults([]);
      setHasMore(false);
    } finally {
      setSearchLoading(false);
      loadMoreRef.current = false;
    }
  }, []);

  // Debounced search — reset on query change
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentOffset(0);
      searchSongs(searchQuery, 0, false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, searchSongs]);

  const loadMore = useCallback(() => {
    if (loadMoreRef.current || !hasMore || !searchQuery.trim()) return;
    searchSongs(searchQuery, currentOffset, true);
  }, [searchQuery, currentOffset, hasMore, searchSongs]);

  const displayedSongs = searchLoading && currentOffset === 0 ? [] : (searchQuery.trim() ? searchResults : recommendedSongs);
  const isAdded = (id: string) => addedSongs.some(s => s.id === id);

  return (
    <motion.main
      key="picker"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="relative z-10 flex flex-col h-screen max-w-lg mx-auto bg-black/40 backdrop-blur-xl border-x border-white/5 overflow-hidden"
    >
      <header className="p-4 border-b border-white/10 flex items-center gap-3 sticky top-0 z-20 bg-black/40 backdrop-blur-md">
        <button
          onClick={onGoBack}
          className="p-1 -ml-1 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold tracking-tight">添加歌曲</h2>
      </header>

      {/* Search Bar */}
      <div className="px-4 py-3">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-white/60 transition-colors" />
          <input
            type="text"
            placeholder="搜索歌曲或歌手"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-10 outline-none focus:bg-white/10 focus:border-white/20 transition-all text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {/* Hint when typing */}
          {searchQuery && !searchQuery.includes('*') && (
            <span className="absolute right-10 top-1/2 -translate-y-1/2 text-[9px] text-white/15 pointer-events-none whitespace-nowrap">
              输入歌曲名*歌手名可组合搜索
            </span>
          )}
        </div>
      </div>

      {/* Section Header */}
      {!searchQuery.trim() && (
        <div className="px-4 pb-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">推荐歌曲</span>
        </div>
      )}

      {/* Song List */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 pb-6 space-y-1"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
            loadMore();
          }
        }}
      >
        {displayedSongs.length === 0 ? (
          <div className="py-10 text-center text-white/20 text-xs">
            {searchLoading ? '搜索中...' : '未找到相关歌曲'}
          </div>
        ) : (
          <>
            {displayedSongs.map((song) => {
              const added = isAdded(song.id);
              return (
                <motion.div
                  layout
                  key={song.id}
                  onClick={() => {
                    if (added) return;
                    if (addedSongs.length >= 9) {
                      onToast('最多只能添加9首音乐哦');
                      return;
                    }
                    onSelect(song);
                  }}
                  className={`flex items-center gap-3 p-2 rounded-xl transition-colors group cursor-pointer ${
                    added ? 'opacity-50' : 'hover:bg-white/5'
                  }`}
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (added) {
                        onToggle(song);
                      } else if (addedSongs.length >= 9) {
                        onToast('最多只能添加9首音乐哦');
                      } else {
                        onSelect(song);
                      }
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border ${
                      added
                        ? 'bg-white border-white text-black'
                        : 'bg-transparent border-white/20 text-white/40 hover:border-white/40 hover:text-white'
                    }`}
                  >
                    {added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </motion.div>
              );
            })}
            {/* Load more indicator */}
            {searchQuery.trim() && hasMore && (
              <div className="py-3 text-center text-white/20 text-xs">
                {searchLoading ? '加载更多...' : '下拉加载更多'}
              </div>
            )}
          </>
        )}
      </div>
    </motion.main>
  );
}
