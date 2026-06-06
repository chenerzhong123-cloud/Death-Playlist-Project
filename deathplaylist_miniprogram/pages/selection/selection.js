var app = getApp()

Page({
  data: {
    addedSongs: [],
    showAuthPopup: false,
    dragging: false,
    dragIdx: -1,
    startY: 0,
    targetIdx: -1,
    dragStyle: '',
    itemStyles: [],
  },

  _itemH: 0,

  onLoad: function() {
    var added = app.globalData.addedSongs || []
    this.setData({
      addedSongs: added,
    })
  },

  onShow: function() {
    var addedSongs = app.globalData.addedSongs || []
    var pick = app.globalData._pendingPick
    app.globalData._pendingPick = null

    if (pick) {
      if (pick.slotIndex < addedSongs.length) {
        addedSongs[pick.slotIndex] = pick.song
      } else {
        addedSongs.push(pick.song)
      }
    }

    app.globalData.addedSongs = addedSongs
    this.setData({ addedSongs: addedSongs })
  },

  onSlotTap: function() {
    wx.navigateTo({ url: '/pages/picker/picker?slotIndex=' + this.data.addedSongs.length })
  },

  removeSong: function(e) {
    var index = e.currentTarget.dataset.index
    var addedSongs = this.data.addedSongs
    addedSongs.splice(index, 1)
    this.setData({ addedSongs: addedSongs })
    app.globalData.addedSongs = addedSongs
  },

  onDragStart: function(e) {
    if (this.data.addedSongs.length < 2 || this.data.dragging) return
    var idx = e.currentTarget.dataset.index
    var touch = e.touches[0]
    this._touchStartY = touch.clientY
    this._pendingDragIdx = idx
    var self = this
    this._dragTimer = setTimeout(function() {
      if (self._pendingDragIdx !== idx) return
      self._activateDrag(idx, self._touchStartY)
    }, 150)
  },

  _activateDrag: function(idx, startY) {
    var count = this.data.addedSongs.length
    var self = this
    wx.createSelectorQuery().in(this).selectAll('.song-slot.filled').boundingClientRect(function(rects) {
      if (rects && rects.length >= 2) {
        var total = 0
        for (var i = 0; i < rects.length - 1; i++) {
          total += rects[i + 1].top - rects[i].top
        }
        self._itemH = total / (rects.length - 1)
      } else {
        self._itemH = 54
      }
      var styles = []
      for (var j = 0; j < count; j++) styles.push('')
      self.setData({
        dragging: true,
        dragIdx: idx,
        startY: startY,
        targetIdx: idx,
        dragStyle: '',
        itemStyles: styles,
      })
    }).exec()
  },

  onDragMove: function(e) {
    if (this._pendingDragIdx >= 0 && !this.data.dragging) {
      var touch = e.touches[0]
      if (Math.abs(touch.clientY - this._touchStartY) > 8) {
        clearTimeout(this._dragTimer)
        this._pendingDragIdx = -1
      }
      return
    }
    if (!this.data.dragging) return
    var touch = e.touches[0]
    var offset = touch.clientY - this.data.startY
    var dragIdx = this.data.dragIdx
    var count = this.data.addedSongs.length
    var itemH = this._itemH || 54

    var targetIdx = dragIdx + Math.round(offset / itemH)
    if (targetIdx < 0) targetIdx = 0
    if (targetIdx >= count) targetIdx = count - 1
    var styles = []
    for (var i = 0; i < count; i++) {
      if (i === dragIdx) {
        styles.push('')
      } else {
        var shift = 0
        if (dragIdx < targetIdx && i > dragIdx && i <= targetIdx) {
          shift = -itemH
        } else if (dragIdx > targetIdx && i >= targetIdx && i < dragIdx) {
          shift = itemH
        }
        styles.push(shift !== 0 ? 'transform:translateY(' + shift + 'px)' : '')
      }
    }

    this.setData({
      targetIdx: targetIdx,
      dragStyle: 'transform:translateY(' + offset + 'px);z-index:100',
      itemStyles: styles,
    })
  },

  onDragEnd: function(e) {
    clearTimeout(this._dragTimer)
    this._pendingDragIdx = -1
    if (!this.data.dragging) return
    var from = this.data.dragIdx
    var to = this.data.targetIdx
    var songs = this.data.addedSongs.slice()

    if (from !== to && from >= 0 && to >= 0) {
      var moved = songs.splice(from, 1)[0]
      songs.splice(to, 0, moved)
      app.globalData.addedSongs = songs
    }

    this.setData({
      addedSongs: songs,
      dragging: false,
      dragIdx: -1,
      targetIdx: -1,
      dragStyle: '',
      itemStyles: [],
    })
  },

  onComplete: function() {
    if (this.data.addedSongs.length === 0) {
      wx.showToast({ title: '请先添加至少一首歌曲', icon: 'none' })
      return
    }
    if (!app.globalData.user) {
      this.setData({ showAuthPopup: true })
      this._pendingAction = function() { wx.navigateTo({ url: '/pages/preview/preview' }) }
      return
    }
    wx.navigateTo({ url: '/pages/preview/preview' })
  },

  onLogin: function() {
    this.setData({ showAuthPopup: false })
    if (this._pendingAction) {
      this._pendingAction()
      this._pendingAction = null
    }
  },

  onCloseAuth: function() {
    this.setData({ showAuthPopup: false })
    this._pendingAction = null
  },

  onShareAppMessage: function() {
    return {
      title: '死亡歌单 — 选好你葬礼上要放的歌',
      path: '/pages/index/index',
    }
  },
})
