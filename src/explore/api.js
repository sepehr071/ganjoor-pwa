// Small fetch helper for the explore section (independent of the core app's src/api.js).
export const BASE = 'https://api.ganjoor.net/api'
const TIMEOUT_MS = 20000
const cache = new Map() // url -> Promise<{data, paging}>

export function parsePaging(raw) {
  if (!raw) return null
  try {
    const p = typeof raw === 'string' ? JSON.parse(raw) : raw
    return {
      total: p.totalCount ?? 0,
      pageSize: p.pageSize ?? 0,
      page: p.currentPage ?? 1,
      pages: p.totalPages ?? 1,
      hasNext: !!p.hasNextPage,
      hasPrev: !!p.hasPreviousPage,
    }
  } catch {
    return null
  }
}

export function buildUrl(path, params) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  }
  const s = q.toString()
  return BASE + path + (s ? '?' + s : '')
}

// GET -> {data, paging}. Cached in memory for the session; failures are not cached.
export function get(path, params) {
  const url = buildUrl(path, params)
  if (cache.has(url)) return cache.get(url)
  const p = (async () => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const text = await res.text()
      let data = null
      if (text) {
        try { data = JSON.parse(text) } catch { data = text }
      }
      return { data, paging: parsePaging(res.headers.get('paging-headers')) }
    } finally {
      clearTimeout(timer)
    }
  })()
  cache.set(url, p)
  p.catch(() => cache.delete(url))
  return p
}

export const json = async (path, params) => (await get(path, params)).data

// Endpoints used by the explore pages.
export const rhythms = () => json('/ganjoor/rhythms', { sortOnVerseCount: true })
export const poets = () => json('/ganjoor/poets')
export const poemsSimilar = (p) => get('/ganjoor/poems/similar', p)
export const people = () => json('/people')
export const person = (id) => json('/people/' + id)
export const personRelations = (id) => json('/people/' + id + '/relations', { evidenceLimit: 2 })
export const personTree = (id) => json('/people/' + id + '/familytree')
export const personPoems = (id) => json('/people/' + id + '/poems')
export const artifacts = (p) => get('/artifacts', p)
export const artifact = (slug) => json('/artifacts/' + encodeURIComponent(slug))
export const locations = () => json('/locations')
export const catGeotags = (catId) => json('/ganjoor/cat/' + catId + '/geotag', { onlyWithLocation: true })
export const literaryDevices = () => json('/ganjoor/literary/devices')
export const literaryOverview = () => json('/ganjoor/literary/stats/overview')
export const deviceConcepts = (id, take = 24) =>
  json('/ganjoor/literary/stats/device/' + id + '/top-concepts', { take })
export const literaryTags = (p) => json('/ganjoor/literary/stats/tags', p)
export const cat = (id) => json('/ganjoor/cat/' + id)
export const wordCounts = (catId, p) => get('/ganjoor/wordcounts/' + catId, p)

export const museumSite = (slug) => 'https://museum.ganjoor.net/items/' + encodeURIComponent(slug)
