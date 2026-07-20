export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001/api'
    : '/deathplaylist/api');

export async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem('jwt');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...headers, ...(options?.headers as Record<string, string>) } });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  album?: string;
  duration?: number;
}

export interface AuthUser {
  id: string;
  nickname: string;
  avatar: string;
}

export interface PublicPlaylist {
  id: string;
  intro: string;
  user: { id: string; name: string; avatar: string };
  songs: Song[];
}
