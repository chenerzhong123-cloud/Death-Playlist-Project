// Decode both forwarded links and reversible 32-character wxacode scenes.
function getSharedPlaylistId(options) {
  if (!options) return ''
  if (options.playlistId || options.id) return options.playlistId || options.id
  if (!options.scene) return ''
  var scene
  try { scene = decodeURIComponent(options.scene) } catch { return '' }
  if (/^[a-f0-9]{32}$/i.test(scene)) {
    return scene.slice(0, 8) + '-' + scene.slice(8, 12) + '-' + scene.slice(12, 16) + '-' + scene.slice(16, 20) + '-' + scene.slice(20)
  }
  if (/^[a-f0-9-]{36}$/i.test(scene)) return scene
  return ''
}

function playlistPath(id) {
  return '/pages/index/index' + (id ? '?playlistId=' + encodeURIComponent(id) : '')
}

module.exports = { getSharedPlaylistId, playlistPath }
