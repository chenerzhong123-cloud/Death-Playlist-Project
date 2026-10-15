const { getSharedPlaylistId, playlistPath } = require('../../utils/share')

Page({
  data: {
    playlist: null,
    userName: '',
    loadError: false,
  },

  onLoad(options) {
    const id = getSharedPlaylistId(options)
    if (id) this.loadPlaylist(id)
    else this.setData({ loadError: true })
  },

  loadPlaylist(id) {
    var self = this
    var api = require('../../utils/api')
    api.request('/playlists/' + encodeURIComponent(id)).then(function(data) {
      self.setData({
        playlist: data,
        userName: data.user ? data.user.name : '用户',
      })
    }).catch(function() {
      self.setData({ loadError: true })
      wx.showToast({ title: '歌单不存在或已删除', icon: 'none' })
    })
  },

  goBack() {
    wx.navigateBack({ fail: function() { wx.reLaunch({ url: '/pages/index/index' }) } })
  },

  onShareAppMessage() {
    var playlist = this.data.playlist
    var path = '/pages/index/index'
    if (playlist && playlist.id) {
      path = playlistPath(playlist.id)
    }
    return {
      title: (this.data.userName || '用户') + '的死亡歌单',
      path: path,
    }
  },
})
