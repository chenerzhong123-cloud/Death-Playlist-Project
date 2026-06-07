import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import type { Song } from '../lib/api';

const CACHE_KEY = 'deathplaylist_recs';
const VISIT_KEY = 'deathplaylist_visit';
const CACHE_VER = 5;
const TARGET = 20;
const CACHE_TTL = 24 * 60 * 60 * 1000;

const KEYWORD_GROUPS = [
  ['rock classic', 'pop hit', 'jazz vocal'],
  ['love song', 'indie folk', 'soul r&b'],
  ['electronic chill', 'country road', 'blues guitar'],
  ['hip hop', 'latin dance', 'piano ballad'],
  ['kpop', 'reggae', 'classical piano'],
  ['metal', 'disco funk', 'acoustic cover'],
];
const EXTRA_KEYWORDS = [
  'soundtrack', 'bossa nova', 'grunge', 'afrobeat',
  'celtic', 'synthpop', 'ska', 'trip hop',
];

function shuffleStrict(songs: Song[]): Song[] {
  const pool = [...songs].sort(() => Math.random() - 0.5);
  const result: Song[] = [];
  while (pool.length > 0) {
    const prev = result[result.length - 1];
    const candidates = pool.map((s, i) => ({ s, i })).filter(({ s }) => !prev || s.artist !== prev.artist);
    if (candidates.length === 0) break;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    result.push(pick.s);
    pool.splice(pick.i, 1);
  }
  return result;
}

function ensureNoAdjacent(songs: Song[]): Song[] {
  const hasViolation = (arr: Song[]) => arr.some((s, i) => i > 0 && s.artist === arr[i - 1].artist);
  for (let attempt = 0; attempt < 5; attempt++) {
    const shuffled = shuffleStrict(songs);
    if (!hasViolation(shuffled)) return shuffled;
  }
  return shuffleStrict(songs);
}

async function fetchBatch(keywords: string[]): Promise<Song[]> {
  const fetched = await Promise.all(
    keywords.map(kw => apiFetch(`/songs/search?q=${encodeURIComponent(kw)}&limit=10`).catch(() => []))
  );
  let pool = fetched.flat() as Song[];
  let result = shuffleStrict(pool);

  let extraIdx = 0;
  while (result.length < TARGET && extraIdx < EXTRA_KEYWORDS.length) {
    const extra = await apiFetch(
      `/songs/search?q=${encodeURIComponent(EXTRA_KEYWORDS[extraIdx])}&limit=10`
    ).catch(() => [] as Song[]);
    pool = [...pool, ...extra];
    result = shuffleStrict(pool);
    extraIdx++;
  }

  return result.slice(0, TARGET);
}

export function useRecommend() {
  const [recommendedSongs, setRecommendedSongs] = useState<Song[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        let visit = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10);
        visit++;
        localStorage.setItem(VISIT_KEY, String(visit));

        const raw = localStorage.getItem(CACHE_KEY);
        let cached: { batches: Song[][]; ts: number; ver?: number } | null = null;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.batches) && parsed.ver === CACHE_VER) cached = parsed;
            else localStorage.removeItem(CACHE_KEY);
          } catch { localStorage.removeItem(CACHE_KEY); }
        }
        const expired = !cached || Date.now() - cached.ts > CACHE_TTL;
        const batchIndex = (visit - 1) % KEYWORD_GROUPS.length;

        if (!expired && cached!.batches[batchIndex]?.length >= TARGET) {
          setRecommendedSongs(ensureNoAdjacent(cached!.batches[batchIndex]));
          return;
        }

        const batchesToFetch = expired
          ? KEYWORD_GROUPS.map((_, i) => i)
          : [batchIndex];

        const results = await Promise.all(
          batchesToFetch.map(i => fetchBatch(KEYWORD_GROUPS[i]))
        );

        if (!cached || expired) {
          cached = { batches: KEYWORD_GROUPS.map(() => []), ts: Date.now(), ver: CACHE_VER };
        }
        batchesToFetch.forEach((idx, i) => {
          cached!.batches[idx] = results[i];
        });
        localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
        const batch = cached.batches[batchIndex].length > 0
          ? cached.batches[batchIndex]
          : results[0];
        setRecommendedSongs(ensureNoAdjacent(batch));
      } catch {
        // Silently fail
      }
    };
    load();
  }, []);

  return { recommendedSongs };
}
