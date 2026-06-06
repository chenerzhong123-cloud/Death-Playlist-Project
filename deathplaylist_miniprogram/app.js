const { tryAutoLogin } = require('./utils/auth')
const { request } = require('./utils/api')

const INTRO_SUGGESTIONS = [
  '给你的人生，留最后一句话',
  '如果这是你最后的BGM',
  '葬礼上，我要放这首歌',
  '离开时，请为我播放',
  '闭上眼之前，听一首',
  '我的告别，由我配乐',
  '人生最后一首，我选好了',
  '当我离去，音乐代替遗言',
  '走的时候，别放哀乐',
  '这是我最后的倔强',
  '如果明天不再来',
  '人生谢幕，歌单已定',
  '让音乐替我说再见',
  '世界最后的旋律，由我定',
  '我选好了，你们播就好',
]

App({
  globalData: {
    user: null,
    addedSongs: [],
    playlistIntro: '',
    myPlaylistId: null,
    suggestedIntro: '',
  },

  onLaunch() {
    wx.cloud.init({ env: 'prod-1gis5b1g29ea3aec' })
    console.log('[app] cloud init done, env: prod-1gis5b1g29ea3aec')
    this.globalData.suggestedIntro = INTRO_SUGGESTIONS[Math.floor(Math.random() * INTRO_SUGGESTIONS.length)]
    this.loginPromise = this.autoLogin()

    // Privacy compliance — resolve when user agrees
    if (wx.onNeedPrivacyAuthorization) {
      wx.onNeedPrivacyAuthorization(function(resolve, event) {
        console.log('[app] onNeedPrivacyAuthorization', event)
        resolve({ event: 'agree' })
      })
    }
  },

  async autoLogin() {
    try {
      const user = await tryAutoLogin()
      if (user) {
        this.globalData.user = user
        await this.loadMyPlaylist()
      }
    } catch {}
  },

  async loadMyPlaylist() {
    try {
      const playlists = await request('/playlists/me')
      if (playlists && playlists.length > 0) {
        const p = playlists[0]
        this.globalData.myPlaylistId = p.id
        this.globalData.playlistIntro = p.intro || ''
        this.globalData.addedSongs = (p.songs || []).map(s => ({
          id: s.id,
          externalId: s.externalId,
          title: s.title,
          artist: s.artist,
          albumArt: s.albumArt,
        }))
      }
    } catch {}
  },
})
