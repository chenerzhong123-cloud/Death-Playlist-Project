const { request } = require('./api')

const CACHE_KEY = 'deathplaylist_recs'
const VISIT_KEY = 'deathplaylist_visit'
const CACHE_VER = 8
const TARGET = 20
const CACHE_TTL = 24 * 60 * 60 * 1000

const KEYWORD_GROUPS = [
  ['rock classic', 'pop hit', 'jazz vocal'],
  ['love song', 'indie folk', 'soul r&b'],
  ['electronic chill', 'country road', 'blues guitar'],
  ['hip hop', 'latin dance', 'piano ballad'],
  ['kpop', 'reggae', 'classical piano'],
  ['metal', 'disco funk', 'acoustic cover'],
]

const EXTRA_KEYWORDS = [
  'soundtrack', 'bossa nova', 'grunge', 'afrobeat',
  'celtic', 'synthpop', 'ska', 'trip hop',
]

function capPerArtist(songs, max) {
  var counts = {}
  var result = []
  for (var k = 0; k < songs.length; k++) {
    var s = songs[k]
    var key = (s.artist || '').toLowerCase().trim()
    counts[key] = (counts[key] || 0) + 1
    if (counts[key] <= max) result.push(s)
  }
  return result
}

function dedupById(songs) {
  var seen = {}
  var result = []
  for (var k = 0; k < songs.length; k++) {
    if (!seen[songs[k].id]) {
      seen[songs[k].id] = true
      result.push(songs[k])
    }
  }
  return result
}

function dedupAdjacent(songs) {
  var result = []
  for (var k = 0; k < songs.length; k++) {
    if (result.length === 0 || (songs[k].artist || '').toLowerCase().trim() !== (result[result.length - 1].artist || '').toLowerCase().trim()) {
      result.push(songs[k])
    }
  }
  return result
}

function shuffleStrict(songs) {
  var pool = songs.slice().sort(function() { return Math.random() - 0.5 })
  var result = []
  while (pool.length > 0) {
    var prev = result[result.length - 1]
    var prevKey = prev ? (prev.artist || '').toLowerCase().trim() : ''
    var candidates = []
    for (var i = 0; i < pool.length; i++) {
      if (!prev || (pool[i].artist || '').toLowerCase().trim() !== prevKey) {
        candidates.push({ s: pool[i], i: i })
      }
    }
    if (candidates.length === 0) break
    var pick = candidates[Math.floor(Math.random() * candidates.length)]
    result.push(pick.s)
    pool.splice(pick.i, 1)
  }
  return result
}

function ensureNoAdjacent(songs) {
  var result = shuffleStrict(songs)
  return dedupAdjacent(result)
}

async function fetchOne(keyword) {
  try {
    return await request(`/songs/search?q=${encodeURIComponent(keyword)}&limit=20`)
  } catch {
    return []
  }
}

async function fetchBatch(keywords) {
  let pool = []
  // Sequential requests to avoid concurrency limits
  for (const kw of keywords) {
    const songs = await fetchOne(kw)
    pool = pool.concat(songs)
    if (pool.length >= TARGET) break
  }
  // If still not enough, try extra keywords one by one
  let extraIdx = 0
  while (pool.length < TARGET && extraIdx < EXTRA_KEYWORDS.length) {
    const extra = await fetchOne(EXTRA_KEYWORDS[extraIdx])
    pool = pool.concat(extra)
    extraIdx++
  }
  // Deduplicate and cap per artist before shuffling to prevent clustering
  var unique = dedupById(pool)
  var capped = capPerArtist(unique, 2)
  return shuffleStrict(capped).slice(0, TARGET)
}

async function loadRecommendations() {
  try {
    let visit = parseInt(wx.getStorageSync(VISIT_KEY) || '0', 10)
    visit++
    wx.setStorageSync(VISIT_KEY, String(visit))

    let cached = null
    const raw = wx.getStorageSync(CACHE_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed.batches) && parsed.ver === CACHE_VER) cached = parsed
        else wx.removeStorageSync(CACHE_KEY)
      } catch { wx.removeStorageSync(CACHE_KEY) }
    }

    const expired = !cached || Date.now() - cached.ts > CACHE_TTL
    const batchIndex = (visit - 1) % KEYWORD_GROUPS.length

    if (!expired && cached.batches[batchIndex] && cached.batches[batchIndex].length >= TARGET) {
      return ensureNoAdjacent(cached.batches[batchIndex])
    }

    const batchesToFetch = expired
      ? KEYWORD_GROUPS.map((_, i) => i)
      : [batchIndex]

    // Fetch batches sequentially (one group at a time)
    const results = []
    for (const idx of batchesToFetch) {
      const batch = await fetchBatch(KEYWORD_GROUPS[idx])
      results.push(batch)
    }

    if (!cached || expired) {
      cached = { batches: KEYWORD_GROUPS.map(() => []), ts: Date.now(), ver: CACHE_VER }
    }
    batchesToFetch.forEach((idx, i) => {
      cached.batches[idx] = results[i]
    })
    wx.setStorageSync(CACHE_KEY, JSON.stringify(cached))

    const batch = cached.batches[batchIndex] && cached.batches[batchIndex].length > 0
      ? cached.batches[batchIndex]
      : results[0]
    return ensureNoAdjacent(batch)
  } catch {
    return []
  }
}

module.exports = { loadRecommendations }
