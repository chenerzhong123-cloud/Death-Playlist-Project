const app = getApp()
const { request } = require('../../utils/api')

Page({
  data: {
    songs: [],
    playlistIntro: '',
    isEditingIntro: false,
    userName: '',
    suggestedIntro: '',
    showAuthPopup: false,
    dragging: false,
    dragIndex: -1,
    dragTranslateY: 0,
  },

  _itemStep: 0,

  onLoad() {
    const songs = app.globalData.addedSongs || []
    const intro = app.globalData.playlistIntro || ''
    const suggestedIntro = app.globalData.suggestedIntro
    const user = app.globalData.user
    this.setData({
      songs,
      playlistIntro: intro,
      userName: user ? user.nickname : '用户',
      suggestedIntro,
    })
  },

  startEditIntro() {
    this.setData({ isEditingIntro: true })
  },

  onIntroInput(e) {
    this.setData({ playlistIntro: e.detail.value })
  },

  finishEditIntro() {
    this.setData({ isEditingIntro: false })
  },

  // Drag reorder
  onDragStart(e) {
    if (this.data.dragging) return
    const { index } = e.currentTarget.dataset

    const query = wx.createSelectorQuery().in(this)
    query.selectAll('.song-item').boundingClientRect(rects => {
      if (!rects || rects.length < 2) return
      this._itemStep = rects[1].top - rects[0].top
    }).exec()

    this.setData({
      dragging: true,
      dragIndex: index,
      dragStartY: e.touches[0].clientY,
      dragTranslateY: 0,
    })
  },

  onDragMove(e) {
    if (!this.data.dragging) return
    const deltaY = e.touches[0].clientY - this.data.dragStartY
    this.setData({ dragTranslateY: deltaY })
  },

  onDragEnd() {
    if (!this.data.dragging) return
    const { dragIndex, dragTranslateY, songs } = this.data
    const step = this._itemStep || 60

    let targetIndex = dragIndex
    if (step > 0 && Math.abs(dragTranslateY) > step * 0.4) {
      const offset = Math.round(dragTranslateY / step)
      targetIndex = Math.max(0, Math.min(songs.length - 1, dragIndex + offset))
    }

    if (targetIndex !== dragIndex) {
      const newSongs = songs.slice()
      const [moved] = newSongs.splice(dragIndex, 1)
      newSongs.splice(targetIndex, 0, moved)
      this.setData({ songs: newSongs })
    }

    this.setData({ dragging: false, dragIndex: -1, dragTranslateY: 0 })
  },

  goBack() {
    app.globalData.addedSongs = this.data.songs
    app.globalData.playlistIntro = this.data.playlistIntro
    app.globalData.playlistDirty = true
    wx.navigateBack()
  },

  async onSaveAndShare() {
    if (!app.globalData.user) {
      this.setData({ showAuthPopup: true })
      this._pendingAction = () => this.doSave()
      return
    }
    await this.doSave()
  },

  async doSave() {
    if (this._saving) return
    this._saving = true
    const { songs } = this.data
    const intro = this.data.playlistIntro || this.data.suggestedIntro || ''
    const songsPayload = songs.map(s => ({
      externalId: s.externalId || s.id,
      title: s.title,
      artist: s.artist,
      albumArt: s.albumArt,
    }))

    try {
      let saved
      let playlistId = app.globalData.myPlaylistId
      if (playlistId) {
        const updated = await request(`/playlists/${playlistId}`, {
          method: 'PUT',
          data: { intro, songs: songsPayload },
        })
        saved = updated
        app.globalData.myPlaylistId = updated.id
      } else {
        const created = await request('/playlists', {
          method: 'POST',
          data: { intro, songs: songsPayload },
        })
        saved = created
        app.globalData.myPlaylistId = created.id
      }

      app.globalData.addedSongs = saved.songs
      this.setData({ songs: saved.songs })
      app.globalData.playlistIntro = intro
      app.globalData.playlistDirty = false

      wx.navigateTo({ url: '/pages/share/share' })
    } catch {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
    } finally { this._saving = false }
  },

  onLogin() {
    this.setData({ showAuthPopup: false })
    if (this._pendingAction) {
      this._pendingAction()
      this._pendingAction = null
    }
  },

  onCloseAuth() {
    this.setData({ showAuthPopup: false })
    this._pendingAction = null
  },

  onShareAppMessage() {
    return {
      title: '死亡歌单 — 选好你葬礼上要放的歌',
      path: '/pages/index/index',
    }
  },
})
