// Production: use same-origin /api via the official domain
// Set USE_CALL_CONTAINER=true and fill CLOUD_ENV for wx.cloud.callContainer mode
const API_BASE = 'https://www.deuce.monster/api'
const USE_CALL_CONTAINER = false
const CLOUD_ENV = 'prod-1gis5b1g29ea3aec'
const SERVICE_NAME = 'express-19oq'

function getHeaders() {
  const token = wx.getStorageSync('jwt')
  const h = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

function wxRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE}${path}`,
      method: options.method || 'GET',
      data: options.data,
      header: { ...getHeaders(), ...(options.header || {}) },
      success(res) {
        if (res.statusCode === 401) {
          wx.removeStorageSync('jwt')
          wx.removeStorageSync('user')
          getApp().globalData.user = null
          reject(new Error('登录已过期，请重新登录'))
          return
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error(`API Error: ${res.statusCode}`))
        }
      },
      fail: reject,
    })
  })
}

function containerRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callContainer({
      config: { env: CLOUD_ENV },
      serviceName: SERVICE_NAME,
      path: path,
      method: options.method || 'GET',
      data: options.data,
      header: { ...getHeaders(), ...(options.header || {}) },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error(`API Error: ${res.statusCode}`))
        }
      },
      fail: reject,
    })
  })
}

function request(path, options = {}) {
  if (USE_CALL_CONTAINER && CLOUD_ENV) {
    return containerRequest(path, options)
  }
  return wxRequest(path, options)
}

module.exports = { request, API_BASE }
