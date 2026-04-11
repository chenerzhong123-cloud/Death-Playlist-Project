export const API_BASE = 'http://47.103.81.95/api';

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
