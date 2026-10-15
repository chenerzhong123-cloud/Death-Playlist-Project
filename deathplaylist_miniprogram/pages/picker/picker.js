var app = getApp()
var api = require('../../utils/api')
var recommend = require('../../utils/recommend')

Page({
  data: {
    searchQuery: '',
    songs: [],
    searchLoading: false,
    autoFocus: true,
    slotIndex: 0,
    addedSongs: [],
  },

  _searchTimer: null,
  _requestVersion: 0,

  onLoad: function(options) {
    this.setData({
      slotIndex: parseInt(options.slotIndex || '0', 10),
      addedSongs: app.globalData.addedSongs || [],
    })
    this.loadRecs()
  },

  syncAddedSongs: function() {
    this.setData({ addedSongs: app.globalData.addedSongs || [] })
  },

  onSearchInput: function(e) {
    var query = e.detail.value
    this._requestVersion++
    this.setData({ searchQuery: query })
    clearTimeout(this._searchTimer)
    if (!query.trim()) {
      this.loadRecs()
      return
    }
    var self = this
    this._searchTimer = setTimeout(function() { self.searchSongs(query) }, 400)
  },

  clearSearch: function() {
    clearTimeout(this._searchTimer)
    this._requestVersion++
    this.setData({ searchQuery: '', searchLoading: false })
    this.loadRecs()
  },

  searchSongs: function(query) {
    if (!query.trim()) return
    var self = this
    var version = ++this._requestVersion
    self.setData({ searchLoading: true })
    api.request('/songs/search?q=' + encodeURIComponent(query) + '&limit=20').then(function(data) {
      if (version !== self._requestVersion || self.data.searchQuery !== query) return
      self.setData({ songs: data, searchLoading: false })
    }).catch(function() {
      if (version !== self._requestVersion || self.data.searchQuery !== query) return
      self.setData({ songs: [], searchLoading: false })
    })
  },

  loadRecs: function() {
    var self = this
    recommend.loadRecommendations().then(function(songs) {
      if (!self.data.searchQuery.trim()) self.setData({ songs: songs, searchLoading: false })
    }).catch(function(e) {
      console.error('[picker] loadRecs failed:', e)
    })
  },

  selectSong: function(e) {
    var index = e.currentTarget.dataset.index
    var song = this.data.songs[index]
    if (!song) return

    // If already added, do nothing (use button to remove)
    var addedSongs = app.globalData.addedSongs || []
    for (var i = 0; i < addedSongs.length; i++) {
      if (addedSongs[i].id === song.id) return
    }

    if (addedSongs.length >= 9) {
      wx.showToast({ title: '最多只能添加9首音乐哦', icon: 'none' })
      return
    }

    app.globalData._pendingPick = {
      slotIndex: this.data.slotIndex,
      song: {
        id: song.id,
        externalId: song.externalId,
        title: song.title,
        artist: song.artist,
        albumArt: song.albumArt,
        duration: song.duration,
      },
    }
    wx.navigateBack()
  },

  toggleSong: function(e) {
    var index = e.currentTarget.dataset.index
    var song = this.data.songs[index]
    if (!song) return

    var addedSongs = app.globalData.addedSongs || []
    var existIdx = -1
    for (var i = 0; i < addedSongs.length; i++) {
      if (addedSongs[i].id === song.id) {
        existIdx = i
        break
      }
    }

    if (existIdx >= 0) {
      var self = this
      wx.showModal({
        title: '提示',
        content: '要取消掉这首歌吗？',
        confirmText: '是',
        cancelText: '否',
        success: function(res) {
          if (res.confirm) {
            addedSongs.splice(existIdx, 1)
            app.globalData.addedSongs = addedSongs
            self.syncAddedSongs()
          }
        },
      })
    } else {
      if (addedSongs.length >= 9) {
        wx.showToast({ title: '最多只能添加9首音乐哦', icon: 'none' })
        return
      }
      app.globalData._pendingPick = {
        slotIndex: this.data.slotIndex,
        song: {
          id: song.id,
          externalId: song.externalId,
          title: song.title,
          artist: song.artist,
          albumArt: song.albumArt,
          duration: song.duration,
        },
      }
      wx.navigateBack()
    }
  },

  onUnload: function() {
    clearTimeout(this._searchTimer)
    this._requestVersion++
  },

  goBack: function() {
    wx.navigateBack()
  },
})
