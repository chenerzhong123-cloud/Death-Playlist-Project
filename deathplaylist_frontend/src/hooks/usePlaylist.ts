import { useState } from 'react';
import { apiFetch } from '../lib/api';
import type { Song } from '../lib/api';

export function usePlaylist() {
  const [addedSongs, setAddedSongs] = useState<Song[]>([]);
  const [playlistIntro, setPlaylistIntro] = useState('');
  const [myPlaylistId, setMyPlaylistId] = useState<string | null>(null);

  const loadMyPlaylist = async () => {
    try {
      const playlists = await apiFetch('/playlists/me');
      if (playlists.length > 0) {
        const p = playlists[0];
        setMyPlaylistId(p.id);
        setPlaylistIntro(p.intro || '');
        setAddedSongs(p.songs.map((s: { id: string; title: string; artist: string; albumArt: string }) => ({
          id: s.id, title: s.title, artist: s.artist, albumArt: s.albumArt,
        })));
      }
    } catch { /* no saved playlist */ }
  };

  const savePlaylist = async (intro: string, songs: Song[]) => {
    const songsPayload = songs.map(s => ({
      externalId: s.id, title: s.title, artist: s.artist, albumArt: s.albumArt,
    }));
    if (myPlaylistId) {
      const updated = await apiFetch(`/playlists/${myPlaylistId}`, {
        method: 'PUT',
        body: JSON.stringify({ intro, songs: songsPayload }),
      });
      setMyPlaylistId(updated.id);
    } else {
      const created = await apiFetch('/playlists', {
        method: 'POST',
        body: JSON.stringify({ intro, songs: songsPayload }),
      });
      setMyPlaylistId(created.id);
    }
    // Update local intro state so it reflects in Friends page etc.
    if (intro && !playlistIntro) {
      setPlaylistIntro(intro);
    }
  };

  return {
    addedSongs, setAddedSongs, playlistIntro, setPlaylistIntro,
    myPlaylistId, setMyPlaylistId, loadMyPlaylist, savePlaylist,
  };
}
