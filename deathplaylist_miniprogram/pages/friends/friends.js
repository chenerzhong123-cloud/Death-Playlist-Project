const app = getApp()
const { request } = require('../../utils/api')

Page({
  data: {
    playlists: [],
    loading: false,
    isGuest: false,
    showAuthPopup: false,
    demoSongs: [
      { title: 'Bohemian Rhapsody', artist: 'Queen', color: '#7c3aed' },
      { title: 'Imagine', artist: 'John Lennon', color: '#2563eb' },
      { title: 'Hotel California', artist: 'Eagles', color: '#dc2626' },
    ],
  },

  async onShow() {
    this.setData({ loading: true })
    if (app.loginPromise) await app.loginPromise
    if (app.globalData.user) this.loadFriendsPlaylists()
    else this.setData({ isGuest: true, loading: false })
  },

  async loadFriendsPlaylists() {
    this.setData({ loading: true, isGuest: false })
    try {
      const data = await request('/playlists/friends')
      const user = app.globalData.user
      const myPlaylistId = app.globalData.myPlaylistId
      const mySongs = app.globalData.addedSongs
      let allPlaylists = data || []

      if (user && myPlaylistId && mySongs && mySongs.length > 0) {
        const effectiveIntro = app.globalData.playlistIntro || app.globalData.suggestedIntro || '暂无简介'
        const myCard = {
          id: myPlaylistId,
          intro: effectiveIntro,
          user: { id: user.id, name: user.nickname, avatar: user.avatar },
          songs: mySongs,
          isMine: true,
        }
        allPlaylists = [myCard].concat(allPlaylists)
      }

      this.setData({ playlists: allPlaylists, loading: false })
    } catch (e) {
      console.error('[friends] loadFriendsPlaylists failed:', e)
      this.setData({ loading: false, isGuest: !app.globalData.user })
      wx.showToast({ title: '歌单加载失败，请稍后重试', icon: 'none' })
    }
  },

  loginAndLoad() {
    if (app.globalData.user) {
      this.loadFriendsPlaylists()
      return
    }
    this.setData({ showAuthPopup: true })
  },

  onLogin() {
    this.setData({ showAuthPopup: false })
    this.loadFriendsPlaylists()
  },

  onCloseAuth() {
    this.setData({ showAuthPopup: false })
  },

  goBack() {
    wx.navigateBack()
  },

  onShareAppMessage() {
    return {
      title: '死亡歌单 — 看看朋友们的歌单',
      path: '/pages/index/index',
    }
  },
})
