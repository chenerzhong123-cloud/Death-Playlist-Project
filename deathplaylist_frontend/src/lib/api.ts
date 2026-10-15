export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001/api'
    : '/deathplaylist/api');

export class ApiError extends Error {
  constructor(public status: number) { super(`API Error: ${status}`); }
}

export async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem('jwt');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(abort, 15000);
  options?.signal?.addEventListener('abort', abort, { once: true });
  if (options?.signal?.aborted) abort();
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, signal: controller.signal,
      headers: { ...headers, ...(options?.headers as Record<string, string>) } });
    if (!res.ok) throw new ApiError(res.status);
    return await res.json();
  } finally {
    clearTimeout(timeout);
    options?.signal?.removeEventListener('abort', abort);
  }
}

export interface Song {
  id: string;
  externalId?: string;
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
