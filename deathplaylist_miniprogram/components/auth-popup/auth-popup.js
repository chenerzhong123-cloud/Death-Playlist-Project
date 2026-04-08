const { loginWithCode } = require('../../utils/auth')

Component({
  properties: {
    show: { type: Boolean, value: false },
  },

  data: {
    nickname: '',
    loading: false,
  },

  methods: {
    onInput(e) {
      this.setData({ nickname: e.detail.value })
    },

    async onLogin() {
      var nickname = this.data.nickname.trim()
      if (!nickname) {
        wx.showToast({ title: '请输入昵称', icon: 'none' })
        return
      }
      if (this.data.loading) return
      this.setData({ loading: true })

      try {
        // 1. Get wx.login code
        var loginRes = await new Promise(function(resolve, reject) {
          wx.login({ success: resolve, fail: reject })
        })
        if (!loginRes.code) {
          wx.showToast({ title: '微信登录失败', icon: 'none' })
          return
        }
        // 2. Send code + nickname to backend
        var user = await loginWithCode(loginRes.code, nickname)
        var app = getApp()
        app.globalData.user = user
        this.triggerEvent('login', { user: user })
        this.setData({ nickname: '' })
      } catch (e) {
        console.error('[auth-popup] login failed:', e)
        wx.showToast({ title: '登录失败，请重试', icon: 'none' })
      } finally {
        this.setData({ loading: false })
      }
    },

    goPrivacy() {
      wx.navigateTo({ url: '/pages/privacy/privacy' })
    },

    noop() {
      // Block event bubbling
    },

    onClose() {
      this.triggerEvent('close')
    },
  },
})
