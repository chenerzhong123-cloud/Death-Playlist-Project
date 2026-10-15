import { useState, useEffect, useCallback } from 'react';
import { apiFetch, ApiError } from '../lib/api';
import type { AuthUser } from '../lib/api';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

let loginRequest: Promise<AuthUser> | null = null;
async function login(): Promise<AuthUser> {
  if (localStorage.getItem('jwt')) {
    try { return await apiFetch('/users/me'); }
    catch (error) {
      // Network errors must not discard an existing identity.
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
    }
  }
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = generateUUID();
    localStorage.setItem('deviceId', deviceId);
  }
  const data = await apiFetch('/auth/device', { method: 'POST', body: JSON.stringify({ deviceId }) });
  localStorage.setItem('jwt', data.accessToken);
  return data.user;
}

function requestLogin() {
  if (!loginRequest) loginRequest = login().finally(() => { loginRequest = null; });
  return loginRequest;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const ensureUser = useCallback(async () => {
    const current = await requestLogin();
    setUser(current);
    return current;
  }, []);
  useEffect(() => {
    let active = true;
    // React StrictMode mounts effects twice; share the in-flight login.
    requestLogin().then(data => { if (active) setUser(data); })
      .catch(() => {})
      .finally(() => { if (active) setAuthLoading(false); });
    return () => { active = false; };
  }, []);
  return { user, setUser, authLoading, ensureUser };
}
