const app = getApp()
const { request } = require('../../utils/api')

Page({
  data: {
    statusBarHeight: 44,
    user: null,
    hasPlaylist: false,
  },

  onLoad() {
    const info = wx.getWindowInfo()
    this.setData({ statusBarHeight: info.statusBarHeight })
  },

  onShow() {
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
})
