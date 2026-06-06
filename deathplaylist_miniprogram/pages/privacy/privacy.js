Page({
  data: {
    content: '',
  },

  onLoad() {
    // Load privacy policy from backend static hosting
    var app = getApp()
    var url = app.globalData && app.globalData.privacyUrl
      ? app.globalData.privacyUrl
      : 'https://prod-1gis5b1g29ea3aec.ap-shanghai.run.tcloudbase.com/privacy.html'

    var self = this
    wx.request({
      url: url,
      success: function(res) {
        if (res.statusCode === 200 && typeof res.data === 'string') {
          // Strip full HTML to body content only for rich-text
          var body = res.data.replace(/<html[\s\S]*?>|<\/html>|<head[\s\S]*?<\/head>|<body[^>]*>|<\/body>/gi, '')
          self.setData({ content: body })
        }
      },
      fail: function() {
        self.setData({
          content: '<h2>隐私政策</h2><p>加载失败，请稍后重试。</p>',
        })
      },
    })
  },
})
