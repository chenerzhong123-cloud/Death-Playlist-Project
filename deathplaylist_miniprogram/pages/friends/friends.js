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

  onLoad() {
    const user = app.globalData.user
    console.log('[friends] onLoad, user:', user ? user.nickname : 'null')
    if (user) {
      this.loadFriendsPlaylists()
    } else {
      this.setData({ isGuest: true })
      console.log('[friends] set isGuest=true')
    }
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
        const myCard = {
          id: myPlaylistId,
          intro: app.globalData.playlistIntro || '',
          user: { id: user.id, name: user.nickname, avatar: user.avatar },
          songs: mySongs,
          isMine: true,
        }
        allPlaylists = [myCard].concat(allPlaylists)
      }

      this.setData({ playlists: allPlaylists, loading: false })
    } catch (e) {
      console.error('[friends] loadFriendsPlaylists failed:', e)
      // Auth expired → treat as guest
      app.globalData.user = null
      wx.removeStorageSync('jwt')
      wx.removeStorageSync('user')
      this.setData({ playlists: [], loading: false, isGuest: true })
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
