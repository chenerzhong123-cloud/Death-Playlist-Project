import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import type { AuthUser } from '../lib/api';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older browsers/WebViews
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
          deviceId = generateUUID();
          localStorage.setItem('deviceId', deviceId);
        }
        const data = await apiFetch('/auth/device', {
          method: 'POST',
          body: JSON.stringify({ deviceId }),
        });
        localStorage.setItem('jwt', data.accessToken);
        setUser(data.user);
      } catch (e) {
        console.error('Device login failed:', e);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  return { user, setUser, authLoading };
}
