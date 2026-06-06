var app = getApp()

Page({
  data: {
    playlist: null,
    userName: '',
  },

  onLoad(options) {
    var playlist = app.globalData.sharedPlaylist
    if (playlist) {
      this.setData({
        playlist: playlist,
        userName: playlist.user ? playlist.user.name : '用户',
      })
      app.globalData.sharedPlaylist = null
    } else if (options && options.id) {
      this.loadPlaylist(options.id)
    }
  },

  loadPlaylist(id) {
    var self = this
    var api = require('../../utils/api')
    api.request('/playlists/' + id).then(function(data) {
      self.setData({
        playlist: data,
        userName: data.user ? data.user.name : '用户',
      })
    }).catch(function() {
      wx.showToast({ title: '歌单不存在或已删除', icon: 'none' })
    })
  },

  goBack() {
    wx.navigateBack()
  },

  onShareAppMessage() {
    var playlist = this.data.playlist
    var path = '/pages/index/index'
    if (playlist && playlist.id) {
      path = '/pages/index/index?playlistId=' + playlist.id
    }
    return {
      title: (this.data.userName || '用户') + '的死亡歌单',
      path: path,
    }
  },
})
