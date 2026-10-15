const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { getSharedPlaylistId, playlistPath } = require('../utils/share')
const id = '12345678-1234-4234-8234-123456789abc'
const tick = () => new Promise(resolve => setImmediate(resolve))
function loadPage(file, app, wx = {}) {
  let definition
  global.getApp = () => app
  global.wx = wx
  global.Page = value => { definition = value }
  const target = path.resolve(__dirname, '../pages', file)
  delete require.cache[target]
  require(target)
  return { ...definition, data: { ...definition.data }, setData(update) { Object.assign(this.data, update) } }
}
afterEach(() => { delete global.wx; delete global.getApp; delete global.Page })

test('forward and QR entry preserve the entire UUID', () => {
  assert.equal(getSharedPlaylistId({ playlistId: id }), id)
  assert.equal(getSharedPlaylistId({ scene: id.replace(/-/g, '') }), id)
  assert.equal(getSharedPlaylistId({ scene: encodeURIComponent(id) }), id)
  assert.equal(getSharedPlaylistId({ scene: '%invalid' }), '')
  assert.equal(playlistPath(id), '/pages/index/index?playlistId=' + id)
})

test('share card forwards to the saved playlist, including fallback QR', async () => {
  const downloads = []
  const app = { globalData: { myPlaylistId: id, addedSongs: [] } }
  const page = loadPage('share/share.js', app, {
    downloadFile(options) {
      downloads.push(options.url)
      options.success({ statusCode: options.url.endsWith('wxacode') ? 503 : 200, tempFilePath: 'qr.png' })
    },
  })
  page.onLoad()
  assert.equal(page.onShareAppMessage().path, playlistPath(id))
  assert.equal(await page.loadWxaCode(), 'qr.png')
  assert.ok(downloads[0].endsWith('/share/' + id + '/wxacode'))
  assert.ok(downloads[1].endsWith('/share/' + id + '/qrcode'))
  assert.equal(typeof page.onReady, 'function')
})

test('direct detail launch fetches the requested ID and has a root-page back fallback', async () => {
  const api = require('../utils/api')
  const request = api.request
  let requested, relaunched
  api.request = async value => { requested = value; return { id, user: { name: '朋友' }, songs: [] } }
  try {
    const page = loadPage('playlist-detail/playlist-detail.js', {}, {
      navigateBack: options => options.fail(), reLaunch: options => { relaunched = options.url },
    })
    page.onLoad({ id })
    await tick()
    assert.equal(requested, '/playlists/' + id)
    assert.equal(page.data.playlist.id, id)
    assert.equal(page.onShareAppMessage().path, playlistPath(id))
    page.goBack()
    assert.equal(relaunched, '/pages/index/index')
  } finally { api.request = request }
})

test('non-auth failures retain login; an old 401 cannot erase a newer session', async () => {
  const storage = new Map([['jwt', 'old'], ['user', { id: 'me' }]])
  let pending
  global.wx = { getStorageSync: key => storage.get(key), removeStorageSync: key => storage.delete(key), request: options => { pending = options } }
  global.getApp = () => ({ globalData: { user: {} } })
  const { request } = require('../utils/api')
  const first = request('/playlists/friends')
  pending.success({ statusCode: 500 })
  await assert.rejects(first, error => error.status === 500)
  assert.equal(storage.get('jwt'), 'old')
  const second = request('/playlists/friends')
  storage.set('jwt', 'new')
  pending.success({ statusCode: 401 })
  await assert.rejects(second, error => error.status === 401)
  assert.equal(storage.get('jwt'), 'new')
})

test('closing auth popup cancels pending preview save', () => {
  const page = loadPage('preview/preview.js', { globalData: {} })
  page._pendingAction = () => { throw new Error('Must not save') }
  page.onCloseAuth()
  assert.equal(page._pendingAction, null)
})

test('preview preserves the edited intro when returning to selection', () => {
  const app = { globalData: {} }
  const page = loadPage('preview/preview.js', app, { navigateBack() {} })
  page.data.playlistIntro = '用户修改的简介'
  page.data.songs = [{ id: 'song' }]
  page.goBack()
  assert.equal(app.globalData.playlistIntro, '用户修改的简介')
  assert.equal(app.globalData.playlistDirty, true)
})
