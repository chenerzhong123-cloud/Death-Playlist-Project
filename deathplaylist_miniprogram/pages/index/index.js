const app = getApp()
const { getSharedPlaylistId } = require('../../utils/share')

Page({
  data: {
    statusBarHeight: 44,
    user: null,
    hasPlaylist: false,
  },

  onLoad(options) {
    const info = wx.getWindowInfo()
    this.setData({ statusBarHeight: info.statusBarHeight })

    const id = getSharedPlaylistId(options)
    if (id) {
      app.globalData.sharedEntry = null
      this.openSharedPlaylist(id)
    }
  },

  onShow() {
    const id = getSharedPlaylistId(app.globalData.sharedEntry)
    app.globalData.sharedEntry = null
    if (id) this.openSharedPlaylist(id)
    const user = app.globalData.user
    const hasPlaylist = !!app.globalData.myPlaylistId
    if (user) this.setData({ user })
    this.setData({ hasPlaylist })

    // If autoLogin hasn't finished yet, wait for it
    if (!hasPlaylist && app.loginPromise) {
      app.loginPromise.then(() => {
        this.setData({ hasPlaylist: !!app.globalData.myPlaylistId })
      })
    }
  },

  goToSelection() {
    wx.navigateTo({ url: '/pages/selection/selection' })
  },

  goToFriends() {
    wx.navigateTo({ url: '/pages/friends/friends' })
  },

  onShareAppMessage() {
    return {
      title: '死亡歌单 — 选好你葬礼上要放的歌',
      path: '/pages/index/index',
    }
  },

  openSharedPlaylist(playlistId) {
    if (this._openingPlaylistId === playlistId) return
    this._openingPlaylistId = playlistId
    wx.navigateTo({
      url: '/pages/playlist-detail/playlist-detail?id=' + encodeURIComponent(playlistId),
      complete: () => { this._openingPlaylistId = null },
    })
  },
})
