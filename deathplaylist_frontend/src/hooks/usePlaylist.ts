import { useState, useRef, useCallback } from 'react';
import { apiFetch, ApiError } from '../lib/api';
import type { Song, PublicPlaylist } from '../lib/api';

export function usePlaylist() {
  const [addedSongs, setAddedSongs] = useState<Song[]>([]);
  const [playlistIntro, setPlaylistIntro] = useState('');
  const [myPlaylistId, setMyPlaylistId] = useState<string | null>(null);
  const [playlistLoaded, setPlaylistLoaded] = useState(false);
  const idRef = useRef<string | null>(null);
  const loadRequest = useRef<Promise<void> | null>(null);
  const saveRequest = useRef<Promise<void> | null>(null);

  const loadMyPlaylist = useCallback(() => {
    if (loadRequest.current) return loadRequest.current;
    loadRequest.current = (async () => {
      try {
        const playlists: PublicPlaylist[] = await apiFetch('/playlists/me');
        if (playlists.length) {
          const p = playlists[0];
          idRef.current = p.id;
          setMyPlaylistId(p.id);
          setPlaylistIntro(p.intro || '');
          setAddedSongs(p.songs);
        }
      } finally { setPlaylistLoaded(true); }
    })().finally(() => { loadRequest.current = null; });
    return loadRequest.current;
  }, []);

  const savePlaylist = (intro: string, songs: Song[]) => {
    if (saveRequest.current) return saveRequest.current;
    saveRequest.current = (async () => {
      if (loadRequest.current) await loadRequest.current;
      // Resolve the saved ID afresh; failed startup loading / another tab may have
      // created a playlist. Never create a second one or overwrite another user.
      if (!idRef.current) {
        const playlists: PublicPlaylist[] = await apiFetch('/playlists/me');
        idRef.current = playlists[0]?.id || null;
      }
      const payload = JSON.stringify({ intro, songs: songs.map(s => ({
        externalId: s.externalId || s.id, title: s.title, artist: s.artist, albumArt: s.albumArt,
      })) });
      const persist = () => idRef.current
        ? apiFetch(`/playlists/${idRef.current}`, { method: 'PUT', body: payload })
        : apiFetch('/playlists', { method: 'POST', body: payload });
      let saved: PublicPlaylist;
      try { saved = await persist(); }
      catch (error) {
        if (!(error instanceof ApiError) || error.status !== 400 || idRef.current) throw error;
        const playlists: PublicPlaylist[] = await apiFetch('/playlists/me');
        if (!playlists[0]) throw error;
        idRef.current = playlists[0].id;
        saved = await persist();
      }
      idRef.current = saved.id;
      setMyPlaylistId(saved.id);
      setAddedSongs(saved.songs);
      setPlaylistIntro(saved.intro);
    })().finally(() => { saveRequest.current = null; });
    return saveRequest.current;
  };

  return { addedSongs, setAddedSongs, playlistIntro, setPlaylistIntro,
    myPlaylistId, playlistLoaded, loadMyPlaylist, savePlaylist };
}
