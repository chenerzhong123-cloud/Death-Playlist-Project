import { StrictMode } from 'react';
import { act, render, renderHook, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../src/App';
import { usePlaylist } from '../src/hooks/usePlaylist';
import { apiFetch } from '../src/lib/api';
import { Picker } from '../src/views/Picker';

vi.mock('../src/lib/api', async importOriginal => ({
  ...await importOriginal<typeof import('../src/lib/api')>(), apiFetch: vi.fn(),
}));
vi.mock('../src/hooks/useRecommend', () => ({ useRecommend: () => ({ recommendedSongs: [] }) }));
vi.mock('../src/views/Share', () => ({ Share: (props: any) => <div>
  <div data-testid="shared-title">{props.userName}</div>
  <div data-testid="shared-songs">{props.addedSongs.map((s: any) => s.title).join(',')}</div>
  <button onClick={props.onGoBack}>返回首页</button>
</div> }));
vi.mock('../src/views/Landing', () => ({ Landing: (props: any) => <button onClick={props.onNewPlaylist}>打开我的歌单</button> }));
vi.mock('../src/views/Selection', () => ({ Selection: (props: any) => <div data-testid="my-songs">{props.addedSongs.map((s: any) => s.title).join(',')}</div> }));

const song = { id: 'db-song', externalId: 'itunes-song', title: '我的歌曲', artist: '歌手', albumArt: 'https://is1-ssl.mzstatic.com/test.jpg' };
const mine = { id: 'mine', intro: '我的简介', user: { id: 'me', name: '我' }, songs: [song] };
const shared = { id: 'shared', intro: '朋友简介', user: { id: 'friend', name: '朋友' }, songs: [{ ...song, id: 'other', title: '朋友歌曲' }] };
const user = { id: 'me', nickname: '我', avatar: '' };
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { resolve, promise }; };

beforeEach(() => { vi.mocked(apiFetch).mockReset(); window.history.replaceState({}, '', '/deathplaylist/'); });

describe('playlist isolation and persistence', () => {
  for (const first of ['mine', 'shared']) {
    it(`keeps shared and own songs separate when ${first} resolves first, including StrictMode`, async () => {
      const ownRequest = deferred<any>();
      const sharedRequest = deferred<any>();
      localStorage.setItem('jwt', 'existing');
      window.history.replaceState({}, '', '/deathplaylist/?playlist=shared&keep=1');
      vi.mocked(apiFetch).mockImplementation(async path => {
        if (path === '/users/me') return user;
        if (path === '/playlists/me') return ownRequest.promise;
        if (path === '/playlists/shared') return sharedRequest.promise;
        throw new Error(path);
      });
      render(<StrictMode><App /></StrictMode>);
      await act(async () => {
        if (first === 'mine') ownRequest.resolve([mine]); else sharedRequest.resolve(shared);
      });
      await act(async () => {
        if (first === 'mine') sharedRequest.resolve(shared); else ownRequest.resolve([mine]);
      });
      expect(await screen.findByTestId('shared-title')).toHaveProperty('textContent', '朋友');
      expect(screen.getByTestId('shared-songs').textContent).toBe('朋友歌曲');
      expect(window.location.search).toContain('playlist=shared');
      fireEvent.click(screen.getByText('返回首页'));
      fireEvent.click(await screen.findByText('打开我的歌单'));
      expect(await screen.findByTestId('my-songs')).toHaveProperty('textContent', '我的歌曲');
      expect(window.location.search).toBe('?keep=1');
      expect(vi.mocked(apiFetch).mock.calls.some(([path]) => path === '/auth/device')).toBe(false);
    });
  }

  it('preserves externalId and coalesces rapid saves into one request', async () => {
    const save = deferred<any>();
    vi.mocked(apiFetch).mockImplementation(async (path, options) => {
      if (path === '/playlists/me') return [mine];
      if (path === '/playlists/mine' && options?.method === 'PUT') return save.promise;
      throw new Error(path);
    });
    const { result } = renderHook(() => usePlaylist());
    await act(() => result.current.loadMyPlaylist());
    expect(result.current.addedSongs[0].externalId).toBe('itunes-song');
    let a!: Promise<void>, b!: Promise<void>;
    act(() => { a = result.current.savePlaylist('新简介', [song]); b = result.current.savePlaylist('新简介', [song]); });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/playlists/mine', expect.anything()));
    const options = vi.mocked(apiFetch).mock.calls.find(([path]) => path === '/playlists/mine')![1]!;
    expect(JSON.parse(options.body as string).songs[0].externalId).toBe('itunes-song');
    await act(async () => { save.resolve({ ...mine, intro: '新简介' }); await Promise.all([a, b]); });
    expect(vi.mocked(apiFetch).mock.calls.filter(([path]) => path === '/playlists/mine')).toHaveLength(1);
    expect(result.current.playlistIntro).toBe('新简介');
  });
});

it('search ignores slower old results and removes duplicate songs during pagination', async () => {
  const old = deferred<any>();
  const page = Array.from({ length: 20 }, (_, i) => ({ ...song, id: 'result-' + i, title: '新歌曲' + i }));
  vi.mocked(apiFetch).mockImplementation(async path => {
    if (path.includes('q=old')) return old.promise;
    if (path.includes('offset=20')) return [page[0], { ...song, id: 'next', title: '下一页' }];
    return page;
  });
  const { container } = render(<Picker addedSongs={[]} onGoBack={() => {}} onSelect={() => {}} onToggle={() => {}} onToast={() => {}} />);
  const input = screen.getByPlaceholderText('搜索歌曲或歌手');
  fireEvent.change(input, { target: { value: 'old' } });
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('q=old')));
  fireEvent.change(input, { target: { value: 'new' } });
  expect(await screen.findByText('新歌曲0')).toBeTruthy();
  await act(async () => { old.resolve([{ ...song, title: '过期结果' }]); });
  expect(screen.queryByText('过期结果')).toBeNull();
  const list = container.querySelector('.overflow-y-auto')!;
  fireEvent.scroll(list);
  expect(await screen.findByText('下一页')).toBeTruthy();
  expect(screen.getAllByText('新歌曲0')).toHaveLength(1);
});
