import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import type { AuthUser } from '../lib/api';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let deviceId = localStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('deviceId', deviceId);
      }
      try {
        const data = await apiFetch('/auth/device', {
          method: 'POST',
          body: JSON.stringify({ deviceId }),
        });
        localStorage.setItem('jwt', data.accessToken);
        setUser(data.user);
      } catch {
        // Device login failed
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  return { user, setUser, authLoading };
}
