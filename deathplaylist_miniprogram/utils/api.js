const API_BASE = 'http://47.103.81.95/api'

// Set to true and fill CLOUD_ENV when using wx.cloud.callContainer (production)
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
