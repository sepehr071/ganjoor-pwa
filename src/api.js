import { dailyPoemById } from './lib/dailyPoems.js'
import {
  offlineCategory, offlineFaal, offlinePoem, offlinePoet, offlinePoets, offlineRandom, offlineSearch,
} from './lib/offlineLibrary.js'

// Public Ganjoor API, no auth, no tracking.
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.ganjoor.net/api'
export const API_ORIGIN = new URL(API_BASE).origin
export const SEMANTIC_URL =
  import.meta.env.VITE_SEMANTIC_URL || 'https://ganjgah.ir/api/ganjoor/search/semantic'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

const cache = new Map() // url -> Promise<{data, paging}>

const qs = (params) => {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(params || {})) if (v !== undefined && v !== null && v !== '') u.set(k, v)
  const s = u.toString()
  return s ? '?' + s : ''
}

async function request(url, init, timeout, signal) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  signal?.addEventListener('abort', () => ctrl.abort(), { once: true })
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    if (!res.ok) throw new ApiError(`HTTP ${res.status}`, res.status)
    return res
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError(ctrl.signal.aborted ? 'timeout' : 'network', 0)
  } finally {
    clearTimeout(timer)
  }
}

export function parsePaging(header) {
  try {
    return header ? JSON.parse(header) : null
  } catch {
    return null
  }
}

/** GET {API_BASE}{path}; resolves {data, paging}. Results are cached in memory for the session. */
export function get(path, params, { signal, timeout = 15000, fresh = false } = {}) {
  const url = API_BASE + path + qs(params)
  if (!fresh && cache.has(url)) return cache.get(url)
  const p = request(url, undefined, timeout, signal)
    .then(async (res) => ({ data: await res.json(), paging: parsePaging(res.headers.get('paging-headers')) }))
    .catch((e) => {
      cache.delete(url)
      throw e
    })
  cache.set(url, p)
  return p
}

export const poetImage = (poet) => (poet?.imageUrl ? API_ORIGIN + poet.imageUrl : '')

async function withOffline(online, offline, signal) {
  const readLocal = () => offline().catch(() => null)
  if (globalThis.navigator?.onLine === false && !signal?.aborted) {
    const local = await readLocal()
    if (local != null) return local
  }
  try {
    return await online()
  } catch (error) {
    if (signal?.aborted) throw error
    const local = await readLocal()
    if (local != null) return local
    throw error
  }
}

// Poem call with only the flags the reader uses.
export const getPoem = (id, opts) =>
  withOffline(() => get(
    `/ganjoor/poem/${id}`,
    {
      catInfo: true,
      rhymes: true,
      recitations: true,
      verseDetails: true,
      navigation: true,
    },
    opts,
  ).then((r) => r.data), async () => await offlinePoem(id).catch(() => null) ?? dailyPoemById(id), opts?.signal)

export const getPoets = (opts) =>
  withOffline(() => get('/ganjoor/poets', null, opts).then((r) => r.data), offlinePoets, opts?.signal)
export const getPoet = (id, opts) =>
  withOffline(() => get(`/ganjoor/poet/${id}`, null, opts).then((r) => r.data), () => offlinePoet(id), opts?.signal)
export const getCategory = (id, opts) =>
  withOffline(() => get(`/ganjoor/cat/${id}`, { poems: true }, opts).then((r) => r.data), () => offlineCategory(id), opts?.signal)
export const getRandomPoem = (poetId = 0, opts) =>
  withOffline(() => get('/ganjoor/poem/random', { poetId }, { fresh: true, ...opts }).then((r) => r.data),
    () => offlineRandom(poetId), opts?.signal)
export const getFaal = (opts) =>
  withOffline(() => get('/ganjoor/hafez/faal', null, { fresh: true, ...opts }).then((r) => r.data), offlineFaal, opts?.signal)
export const getVerseTiming = (recitationId, opts) => get(`/audio/verses/${recitationId}`, null, opts).then((r) => r.data)

export const searchText = (term, page = 1, pageSize = 20, { poetId, ...opts } = {}) =>
  withOffline(() => get('/ganjoor/poems/search', { term, poetId, PageNumber: page, PageSize: pageSize }, opts),
    () => offlineSearch(term, page, pageSize, poetId, { signal: opts.signal }), opts.signal)

/** Semantic search on ganjgah.ir. Throws ApiError on any failure so the caller can fall back to text search. */
export async function searchMeaning(query, topK = 15, opts = {}) {
  const res = await request(
    SEMANTIC_URL,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, topK, disableScopeDetection: false }),
    },
    opts.timeout ?? 20000,
    opts.signal,
  )
  return res.json()
}
