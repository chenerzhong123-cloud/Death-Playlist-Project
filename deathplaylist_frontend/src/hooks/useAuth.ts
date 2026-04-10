import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../lib/api';
import type { AuthUser } from '../lib/api';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [authNickname, setAuthNickname] = useState('');
  const pendingAction = useRef<(() => void) | null>(null);

  const requireLogin = (): boolean => {
    if (user) return true;
    setShowAuthPopup(true);
    return false;
  };

  const handleLogin = async () => {
    const nickname = authNickname.trim() || '微信用户';
    const data = await apiFetch('/auth/wechat', {
      method: 'POST',
      body: JSON.stringify({ code: `mock_${nickname}`, nickname }),
    });
    localStorage.setItem('jwt', data.accessToken);
    setUser(data.user);
    setShowAuthPopup(false);
    if (pendingAction.current) {
      pendingAction.current();
      pendingAction.current = null;
    }
    return data.user as AuthUser;
  };

  const autoLogin = async () => {
    const storedJwt = localStorage.getItem('jwt');
    if (storedJwt) {
      try {
        const profile = await apiFetch('/users/me');
        const u = { id: profile.id, nickname: profile.nickname, avatar: profile.avatar };
        setUser(u);
        setAuthLoading(false);
        return u;
      } catch {
        localStorage.removeItem('jwt');
      }
    }

    const params = new URLSearchParams(window.location.search);
    const wxCode = params.get('wxCode');
    const wxNickname = params.get('wxNickname');

    if (wxNickname) setAuthNickname(wxNickname);

    if (wxCode) {
      try {
        const data = await apiFetch('/auth/wechat', {
          method: 'POST',
          body: JSON.stringify({ code: wxCode }),
        });
        localStorage.setItem('jwt', data.accessToken);
        setUser(data.user);
        window.history.replaceState({}, '', window.location.pathname);
        setAuthLoading(false);
        return data.user as AuthUser;
      } catch {
        // Code login failed
      }
    }

    setAuthLoading(false);
    return null;
  };

  return {
    user, setUser, authLoading, showAuthPopup, setShowAuthPopup,
    authNickname, setAuthNickname, pendingAction, requireLogin,
    handleLogin, autoLogin,
  };
}
