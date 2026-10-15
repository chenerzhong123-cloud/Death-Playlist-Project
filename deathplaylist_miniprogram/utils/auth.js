const { request } = require('./api')

function isLoggedIn() {
  return !!wx.getStorageSync('jwt')
}

function getUser() {
  return wx.getStorageSync('user')
}

function setSession(data) {
  wx.setStorageSync('jwt', data.accessToken)
  const user = { id: data.user.id, nickname: data.user.nickname, avatar: data.user.avatar }
  wx.setStorageSync('user', user)
  return user
}

async function loginWithCode(code, nickname) {
  var payload = { code: code }
  if (nickname) payload.nickname = nickname
  var data = await request('/auth/wechat', {
    method: 'POST',
    data: payload,
  })
  return setSession(data)
}

async function fetchProfile() {
  const profile = await request('/users/me')
  const user = { id: profile.id, nickname: profile.nickname, avatar: profile.avatar }
  wx.setStorageSync('user', user)
  return user
}

async function tryAutoLogin() {
  // 1. Try stored JWT
  const token = wx.getStorageSync('jwt')
  if (token) {
    try {
      return await fetchProfile()
    } catch (error) {
      if (error.status !== 401) return null
    }
  }

  // 2. Try wx.login
  try {
    const loginRes = await new Promise((resolve, reject) => {
      wx.login({ success: resolve, fail: reject })
    })
    if (loginRes.code) {
      return await loginWithCode(loginRes.code)
    }
  } catch {}

  return null
}

function logout() {
  wx.removeStorageSync('jwt')
  wx.removeStorageSync('user')
}

module.exports = { isLoggedIn, getUser, setSession, loginWithCode, fetchProfile, tryAutoLogin, logout }
