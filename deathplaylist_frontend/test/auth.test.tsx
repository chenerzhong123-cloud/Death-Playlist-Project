import { renderHook, waitFor, act } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { apiFetch } from '../src/lib/api';
import { useAuth } from '../src/hooks/useAuth';
vi.mock('../src/lib/api', async importOriginal => ({ ...await importOriginal<typeof import('../src/lib/api')>(), apiFetch: vi.fn() }));
it('retries anonymous login after a temporary startup outage before saving', async () => {
  vi.mocked(apiFetch).mockRejectedValueOnce(new Error('offline'));
  const { result } = renderHook(() => useAuth());
  await waitFor(() => expect(result.current.authLoading).toBe(false));
  expect(result.current.user).toBeNull();
  vi.mocked(apiFetch).mockResolvedValueOnce({ accessToken: 'new-token', user: { id: 'recovered', nickname: '恢复用户', avatar: '' } });
  await act(() => result.current.ensureUser());
  expect(result.current.user?.id).toBe('recovered');
  expect(localStorage.getItem('jwt')).toBe('new-token');
});
