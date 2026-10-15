// Production: use same-origin /api via the official domain
// Set USE_CALL_CONTAINER=true and fill CLOUD_ENV for wx.cloud.callContainer mode
const API_BASE = 'https://www.deuce.monster/deathplaylist/api'
const USE_CALL_CONTAINER = false
const CLOUD_ENV = 'prod-1gis5b1g29ea3aec'
const SERVICE_NAME = 'express-19oq'

function getHeaders() {
  const token = wx.getStorageSync('jwt')
  const h = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

function responseError(res, headers) {
  if (res.statusCode === 401 && wx.getStorageSync('jwt') &&
      headers.Authorization === `Bearer ${wx.getStorageSync('jwt')}`) {
    wx.removeStorageSync('jwt')
    wx.removeStorageSync('user')
    getApp().globalData.user = null
  }
  const error = new Error(res.statusCode === 401 ? '登录已过期，请重新登录' : `API Error: ${res.statusCode}`)
  error.status = res.statusCode
  return error
}

function request(path, options = {}) {
  const headers = { ...getHeaders(), ...(options.header || {}) }
  return new Promise((resolve, reject) => {
    const config = {
      method: options.method || 'GET', data: options.data, header: headers,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data)
        else reject(responseError(res, headers))
      },
      fail: reject,
    }
    if (USE_CALL_CONTAINER && CLOUD_ENV) {
      wx.cloud.callContainer({ ...config, config: { env: CLOUD_ENV },
        serviceName: SERVICE_NAME, path: '/api' + path })
    } else {
      wx.request({ ...config, url: API_BASE + path, timeout: 15000 })
    }
  })
}

module.exports = { request, API_BASE }
