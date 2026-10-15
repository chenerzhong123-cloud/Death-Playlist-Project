import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import { configureApp } from '../src/setup';
import { Playlist } from '../src/playlists/playlist.entity';
import { Song } from '../src/songs/song.entity';
import { SongsService } from '../src/songs/songs.service';
import { ShareService } from '../src/share/share.service';

let app: NestExpressApplication;
let base: string;
let token: string;
let otherToken: string;
let playlistId: string;
let song: Song;
let db: DataSource;
const realFetch = global.fetch;
const payload = () => ({ intro: '原简介', songs: [{ externalId: song.externalId, title: song.title, artist: song.artist, albumArt: song.albumArt }] });
const call = async (path: string, method = 'GET', body?: unknown, jwt?: string) => {
  const response = await realFetch(base + path, { method,
    headers: { 'Content-Type': 'application/json', ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body) });
  const data = response.headers.get('content-type')?.includes('json') ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { status: response.status, data };
};

beforeAll(async () => {
  process.env.DB_DATABASE = ':memory:';
  process.env.PUBLIC_BASE_URL = 'https://www.deuce.monster/deathplaylist/';
  process.env.WECHAT_APP_ID = 'test-app';
  process.env.WECHAT_APP_SECRET = 'test-secret';
  const { AppModule } = await import('../src/app.module');
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication<NestExpressApplication>({ logger: false });
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl() + '/api';
  db = app.get(DataSource);
  song = (await db.getRepository(Song).find())[0];
  token = (await call('/auth/device', 'POST', { deviceId: 'regression-owner' })).data.accessToken;
  otherToken = (await call('/auth/device', 'POST', { deviceId: 'regression-other' })).data.accessToken;
});
afterAll(async () => { await app?.close(); });
afterEach(() => { jest.restoreAllMocks(); });

test('creates one playlist under concurrent saves and requires authentication', async () => {
  expect((await call('/playlists', 'POST', payload())).status).toBe(401);
  const results = await Promise.all([call('/playlists', 'POST', payload(), token), call('/playlists', 'POST', payload(), token)]);
  expect(results.map(r => r.status).sort()).toEqual([201, 400]);
  playlistId = results.find(r => r.status === 201)!.data.id;
  expect((await call('/playlists/me', 'GET', undefined, token)).data).toHaveLength(1);
});

test('public and legacy friends endpoints agree, exclude the owner, and preserve ordering', async () => {
  const songs = (await db.getRepository(Song).find()).slice(0, 3).reverse();
  expect((await call(`/playlists/${playlistId}`, 'PUT', { songs: songs.map(s => ({ externalId: s.externalId, title: s.title, artist: s.artist })) }, token)).status).toBe(200);
  for (const path of ['/playlists/me', '/playlists/public', '/playlists/friends']) {
    const result = await call(path, 'GET', undefined, path.endsWith('me') ? token : otherToken);
    expect(result.status).toBe(200);
    const playlist = result.data.find((p: any) => p.id === playlistId);
    expect(playlist.songs.map((s: any) => s.id)).toEqual(songs.map(s => s.id));
  }
  expect((await call('/playlists/public', 'GET', undefined, token)).data.some((p: any) => p.id === playlistId)).toBe(false);
});

test('rejects invalid/unauthorized edits without changing saved content', async () => {
  const before = (await call(`/playlists/${playlistId}`)).data;
  expect((await call(`/playlists/${playlistId}`, 'PUT', { intro: '不应保存', songs: [] }, token)).status).toBe(400);
  expect((await call(`/playlists/${playlistId}`, 'PUT', payload(), otherToken)).status).toBe(404);
  expect((await call(`/playlists/${playlistId}`, 'DELETE', undefined, otherToken)).status).toBe(404);
  expect((await call(`/playlists/${playlistId}`)).data).toEqual(before);
});

test('rolls back deleted songs and metadata when a write fails', async () => {
  const before = (await call(`/playlists/${playlistId}`)).data;
  jest.spyOn(app.get(SongsService), 'findOrCreate').mockRejectedValueOnce(new Error('simulated storage failure'));
  expect((await call(`/playlists/${playlistId}`, 'PUT', { ...payload(), intro: '不应保存' }, token)).status).toBe(500);
  expect((await call(`/playlists/${playlistId}`)).data).toEqual(before);
});

test('legacy UUID song references reuse existing songs instead of growing the library', async () => {
  const count = await db.getRepository(Song).count();
  const result = await call(`/playlists/${playlistId}`, 'PUT', { songs: [{ externalId: song.id, title: song.title, artist: song.artist }] }, token);
  expect(result.data.songs[0].id).toBe(song.id);
  expect(await db.getRepository(Song).count()).toBe(count);
});

test('QR is generated locally, uses the public HTTPS subpath, and rejects missing playlists', async () => {
  const spy = jest.spyOn(global, 'fetch');
  const data = await call(`/share/${playlistId}`);
  expect(data.data.shareUrl).toBe(`https://www.deuce.monster/deathplaylist/?playlist=${playlistId}`);
  expect(data.data.qrCodeUrl).toContain(`/deathplaylist/api/share/${playlistId}/qrcode`);
  const image = await call(`/share/${playlistId}/qrcode`);
  expect(image.status).toBe(200);
  expect(image.data.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(spy).not.toHaveBeenCalled();
  expect((await call('/share/missing/qrcode')).status).toBe(404);
});

test('restores WeChat login without accepting invalid codes or a mock fallback', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ openid: 'real-wechat-user' }), { status: 200 }));
  const first = await call('/auth/wechat', 'POST', { code: 'valid', nickname: '测试用户' });
  expect(first.status).toBe(200);
  const profile = await call('/users/me', 'GET', undefined, first.data.accessToken);
  expect(profile.data.nickname).toBe('测试用户');
  jest.mocked(global.fetch).mockResolvedValueOnce(new Response(JSON.stringify({ errcode: 40029 }), { status: 200 }));
  expect((await call('/auth/wechat', 'POST', { code: 'invalid' })).status).toBe(401);
  jest.mocked(global.fetch).mockRejectedValueOnce(new Error('timeout'));
  expect((await call('/auth/wechat', 'POST', { code: 'unavailable' })).status).toBe(503);
});

test('wxacode fits the complete UUID in scene, uses release, caches token, and retries expiration', async () => {
  const spy = jest.spyOn(global, 'fetch');
  spy.mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'first-token', expires_in: 7200 })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ errcode: 40001 })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'new-token', expires_in: 7200 })))
    .mockResolvedValueOnce(new Response('png', { headers: { 'Content-Type': 'image/png' } }));
  expect((await call(`/share/${playlistId}/wxacode`)).status).toBe(200);
  const body = JSON.parse(spy.mock.calls[1][1]!.body as string);
  expect(body.scene).toBe(playlistId.replace(/-/g, ''));
  expect(body.scene).toHaveLength(32);
  expect(body.env_version).toBe('release');
  spy.mockResolvedValueOnce(new Response('png', { headers: { 'Content-Type': 'image/png' } }));
  expect((await call(`/share/${playlistId}/wxacode`)).status).toBe(200);
  expect(spy).toHaveBeenCalledTimes(5);
});

test('public image proxy blocks SSRF and unsafe redirects before fetching private resources', async () => {
  const spy = jest.spyOn(global, 'fetch');
  for (const url of ['http://127.0.0.1:3000', 'https://169.254.169.254/', 'https://example.com/a', 'https://x.mzstatic.com.evil.test/', 'https://x.mzstatic.com:444/a']) {
    expect((await call('/utils/image-proxy?url=' + encodeURIComponent(url))).status).toBe(400);
  }
  expect(spy).not.toHaveBeenCalled();
  spy.mockResolvedValueOnce(new Response('', { status: 302, headers: { location: 'http://127.0.0.1/secret' } }));
  expect((await call('/utils/image-proxy?url=' + encodeURIComponent('https://picsum.photos/seed/test/100/100'))).status).toBe(400);
  expect(spy).toHaveBeenCalledTimes(1);
});

test('local song search respects offset and rejects malformed pagination', async () => {
  jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
  const songs = app.get(SongsService);
  const first = await songs.search('a', 1, 0);
  const second = await songs.search('a', 1, 1);
  expect(first).toHaveLength(1);
  expect(second).toHaveLength(1);
  expect(first[0].id).not.toBe(second[0].id);
  for (const query of ['limit=NaN', 'limit=-1', 'limit=0', 'limit=201', 'offset=-1', 'offset=1.5']) {
    expect((await call('/songs/search?' + query)).status).toBe(400);
  }
});

test('iTunes pagination uses one cached result set and never repeats page one', async () => {
  const results = Array.from({ length: 5 }, (_, i) => ({ trackId: 90000 + i, trackName: '分页' + i, artistName: '测试' }));
  const spy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ results })));
  const service = app.get(SongsService);
  const first = await service.search('pagination-only', 2, 0);
  const next = await service.search('pagination-only', 2, 2);
  expect(first.map(s => s.externalId)).toEqual(['90000', '90001']);
  expect(next.map(s => s.externalId)).toEqual(['90002', '90003']);
  expect(spy).toHaveBeenCalledTimes(1);
  expect((await service.search('pagination-only', 2, 10))).toEqual([]);
});

test('rejects two aliases of the same song and rolls back the update', async () => {
  const before = (await call(`/playlists/${playlistId}`)).data;
  const songs = [song.externalId, song.id].map(externalId => ({ externalId, title: song.title, artist: song.artist }));
  expect((await call(`/playlists/${playlistId}`, 'PUT', { songs }, token)).status).toBe(400);
  expect((await call(`/playlists/${playlistId}`)).data).toEqual(before);
});
