const app = getApp()
const { API_BASE } = require('../../utils/api')
const { playlistPath } = require('../../utils/share')

Page({
  data: {
    userName: '',
    playlistIntro: '',
    songs: [],
    shareImagePath: '',
    shareError: false,
  },

  onLoad() {
    const user = app.globalData.user
    this.setData({
      userName: user ? user.nickname : '用户',
      playlistIntro: app.globalData.playlistIntro || app.globalData.suggestedIntro || '',
      songs: app.globalData.addedSongs || [],
    })
    this.playlistId = app.globalData.myPlaylistId
  },

  onReady() {
    this.drawShareCard()
  },

  async drawShareCard() {
    if (this._drawing) return
    this._drawing = true
    this.setData({ shareError: false })
    try {
      const canvas = await new Promise((resolve, reject) => {
        wx.createSelectorQuery().in(this).select('#shareCanvas')
          .fields({ node: true, size: true }).exec(res => {
            if (res[0] && res[0].node) resolve(res[0].node)
            else reject(new Error('Canvas unavailable'))
          })
      })
      const codePath = await this.loadWxaCode()
      if (!codePath) throw new Error('Share code unavailable')
      await this._drawCard(canvas, codePath)
    } catch {
      this.setData({ shareError: true })
      wx.showToast({ title: '分享图片生成失败，请重试', icon: 'none' })
    } finally { this._drawing = false }
  },

  async loadWxaCode() {
    if (!this.playlistId) return null
    const download = suffix => new Promise(resolve => {
      wx.downloadFile({
        url: `${API_BASE}/share/${encodeURIComponent(this.playlistId)}/${suffix}`,
        timeout: 10000,
        success: res => resolve(res.statusCode === 200 ? res.tempFilePath : null),
        fail: () => resolve(null),
      })
    })
    // If WeChat is temporarily unavailable, the fallback still opens this playlist.
    return await download('wxacode') || await download('qrcode')
  },

  truncateText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text
    let t = text
    while (t.length > 0 && ctx.measureText(t + '...').width > maxWidth) {
      t = t.slice(0, -1)
    }
    return t + '...'
  },

  async _drawCard(canvas, wxacodePath) {
    const ctx = canvas.getContext('2d')
    const dpr = wx.getWindowInfo().pixelRatio

    // Dimensions — match selection page spacing (1rpx ≈ 0.5px on 750rpx base)
    const W = 340
    const pad = 16          // ≈ selection 32rpx
    const artSize = 44      // ≈ selection 88rpx
    const songItemH = 54    // artSize 44 + 5px padding top + 5px bottom ≈ selection row
    const songListH = this.data.songs.length * songItemH
    const footerH = 60
    const titleY = pad + 18
    const introY = titleY + 22
    const songStartY = introY + 16
    const H = songStartY + songListH + 16 + footerH + pad

    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    // Background — plain black, no rounded corners, no border
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)

    // Title
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 15px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(this.data.userName + '的死亡歌单', W / 2, titleY)

    // Intro
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = 'italic 12px sans-serif'
    const intro = this.data.playlistIntro || '暂无简介'
    ctx.fillText(intro.length > 24 ? intro.slice(0, 24) + '...' : intro, W / 2, introY)

    // Load album art images
    const artX = pad
    const images = await Promise.all(this.data.songs.map((song) => {
      return new Promise((resolve) => {
        if (!song.albumArt) { resolve(null); return }
        const img = canvas.createImage()
        let settled = false
        img.onload = () => { if (!settled) { settled = true; resolve(img) } }
        img.onerror = () => { if (!settled) { settled = true; resolve(null) } }
        img.src = song.albumArt
        setTimeout(() => { if (!settled) { settled = true; resolve(null) } }, 5000)
      })
    }))

    // Load wxacode image
    let wxacodeImg = null
    if (wxacodePath) {
      wxacodeImg = await new Promise((resolve) => {
        const img = canvas.createImage()
        const timeout = setTimeout(() => resolve(null), 8000)
        img.onload = () => { clearTimeout(timeout); resolve(img) }
        img.onerror = () => { clearTimeout(timeout); resolve(null) }
        img.src = wxacodePath
      })
    }

    // Songs
    ctx.textAlign = 'left'
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e']
    const textX = pad + artSize + 12
    const maxTextW = W - pad - textX

    this.data.songs.forEach((song, i) => {
      const y = songStartY + i * songItemH + songItemH / 2
      const artY = y - artSize / 2

      // Album art
      if (images[i]) {
        ctx.save()
        this.roundRect(ctx, artX, artY, artSize, artSize, 7)
        ctx.clip()
        ctx.drawImage(images[i], artX, artY, artSize, artSize)
        ctx.restore()
      } else {
        ctx.fillStyle = colors[i % colors.length] + '40'
        this.roundRect(ctx, artX, artY, artSize, artSize, 7)
        ctx.fill()
      }

      // Song title
      ctx.fillStyle = '#ffffff'
      ctx.font = '600 15px sans-serif'
      const title = this.truncateText(ctx, song.title, maxTextW)
      ctx.fillText(title, textX, y - 4)

      // Artist
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.font = '12px sans-serif'
      const artist = this.truncateText(ctx, song.artist, maxTextW)
      ctx.fillText(artist, textX, y + 12)
    })

    // Divider
    const dividerY = songStartY + songListH + 8
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pad, dividerY)
    ctx.lineTo(W - pad, dividerY)
    ctx.stroke()

    // Footer
    const footerY = dividerY + 12

    // QR code area on the right
    const qrSize = 44
    const qrX = W - pad - qrSize
    const qrY = footerY

    if (!wxacodeImg) throw new Error('Share code unavailable')
    ctx.save()
    this.roundRect(ctx, qrX, qrY, qrSize, qrSize, 4)
    ctx.clip()
    ctx.drawImage(wxacodeImg, qrX, qrY, qrSize, qrSize)
    ctx.restore()

    // Footer text on the left
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = 'bold 10px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('死亡歌单', pad, footerY + 14)

    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.font = 'italic 8px sans-serif'
    ctx.fillText('定义自己生命的最后乐章', pad, footerY + 28)

    // Export
    await new Promise((resolve, reject) => wx.canvasToTempFilePath({
      canvas,
      quality: 0.9,
      success: (res) => {
        this.setData({ shareImagePath: res.tempFilePath })
        resolve(res.tempFilePath)
      },
      fail: reject,
    }))
  },

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
  },

  async saveToAlbum() {
    const filePath = this.data.shareImagePath
    if (!filePath) {
      wx.showToast({ title: '图片生成中...', icon: 'none' })
      return
    }
    try {
      // Privacy authorization required before saving
      await wx.requirePrivacyAuthorize()
      await wx.saveImageToPhotosAlbum({ filePath })
      wx.showToast({ title: '已保存到相册', icon: 'success' })
    } catch (err) {
      if (err.errMsg && err.errMsg.includes('auth')) {
        wx.showModal({
          title: '提示',
          content: '需要授权保存图片到相册',
          success(res) {
            if (res.confirm) wx.openSetting()
          },
        })
      }
    }
  },

  goBack() {
    wx.navigateBack()
  },

  onShareAppMessage() {
    return {
      title: `${this.data.userName}的死亡歌单 — 定义自己生命的最后乐章`,
      path: playlistPath(this.playlistId),
      imageUrl: this.data.shareImagePath || '',
    }
  },
})
