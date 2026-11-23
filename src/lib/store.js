// Tiny persistence: localStorage (try/catch, in-memory fallback) plus an IndexedDB kv for offline poems.
import { useEffect, useState } from 'preact/hooks'

const mem = {}
const listeners = new Set()

export function read(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    if (v !== null) return JSON.parse(v)
  } catch {}
  return key in mem ? mem[key] : fallback
}

export function write(key, value) {
  mem[key] = value
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
  listeners.forEach((f) => f(key))
}

/** useState backed by storage; setter accepts a value or an updater. */
export function useStored(key, fallback) {
  const [v, setV] = useState(() => read(key, fallback))
  useEffect(() => {
    const f = (k) => k === key && setV(read(key, fallback))
    listeners.add(f)
    return () => listeners.delete(f)
  }, [key])
  return [v, (n) => write(key, typeof n === 'function' ? n(read(key, fallback)) : n)]
}

export const BOOKMARKS = 'beyt:bookmarks'
export const HISTORY = 'beyt:history'
export const SETTINGS = 'beyt:settings'
// Storage keys keep the old "beyt:" prefix so existing bookmarks and settings survive the rename.
export const DEFAULT_SETTINGS = { theme: 'system', fontSize: 20, lineHeight: 2.1, poemFont: 'sans' }

export function toggleBookmark(ref) {
  const list = read(BOOKMARKS, [])
  const has = list.some((b) => b.id === ref.id)
  write(BOOKMARKS, has ? list.filter((b) => b.id !== ref.id) : [ref, ...list])
  return !has
}

export function pushHistory(ref) {
  write(HISTORY, [ref, ...read(HISTORY, []).filter((h) => h.id !== ref.id)].slice(0, 60))
}

/** Merge fields (reading position) into a history entry. */
export function updateHistory(id, patch) {
  write(HISTORY, read(HISTORY, []).map((h) => (h.id === id ? { ...h, ...patch } : h)))
}

/** Set once the reader has seen the "tap a beyt" hint. */
export const COACH = 'beyt:coach'

export function applySettings(s) {
  const r = document.documentElement
  if (s.theme === 'light' || s.theme === 'dark') r.setAttribute('data-theme', s.theme)
  else r.removeAttribute('data-theme')
  r.style.setProperty('--font-size-poem', s.fontSize + 'px')
  r.style.setProperty('--poem-lh', s.lineHeight)
  // The nastaliq face is always declared (tokens.css: titles use it); this only switches the poem text.
  if (s.poemFont === 'nastaliq') r.setAttribute('data-poem-font', 'nastaliq')
  else r.removeAttribute('data-poem-font')
}

// ---- IndexedDB: poems saved for offline (full API payload) ----
const DB = 'beyt'
const STORE = 'offline-poems'
const AUDIO = 'offline-audio'

function open() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) return reject(new Error('no idb'))
    const r = indexedDB.open(DB, 2)
    r.onupgradeneeded = ({ oldVersion }) => {
      if (oldVersion === 0) r.result.createObjectStore(STORE, { keyPath: 'id' })
      r.result.createObjectStore(AUDIO, { keyPath: ['poemId', 'id'] })
    }
    let blocked = false
    r.onblocked = () => {
      blocked = true
      reject(new Error('Close other Beyt tabs to update offline storage'))
    }
    r.onsuccess = () => {
      if (blocked) r.result.close()
      else {
        r.result.onversionchange = () => r.result.close()
        resolve(r.result)
      }
    }
    r.onerror = () => reject(r.error)
  })
}

async function tx(mode, fn, stores = [STORE]) {
  const db = await open()
  try {
    return await new Promise((resolve, reject) => {
      const t = db.transaction(stores, mode)
      t.onabort = () => reject(t.error || new Error('Storage transaction aborted'))
      try {
        const req = fn(t.objectStore(stores[0]), t)
        t.oncomplete = () => resolve(req?.result)
      } catch (error) {
        t.abort()
        reject(error)
      }
    })
  } finally {
    db.close()
  }
}

export const savedPoemGet = (id) => tx('readonly', (s) => s.get(Number(id))).catch(() => undefined)
export const savedPoemPut = (poem) => tx('readwrite', (s) => s.put(poem))
const audioKeys = (id) => IDBKeyRange.bound([Number(id)], [Number(id), []])
export const savedPoemDelete = (id) => tx('readwrite', (s, t) => {
  t.objectStore(AUDIO).delete(audioKeys(id))
  return s.delete(Number(id))
}, [STORE, AUDIO])
export const savedPoems = () => tx('readonly', (s) => s.getAll()).catch(() => [])

export const savedAudioIds = (poemId) => tx('readonly', (s) => s.getAllKeys(audioKeys(poemId)), [AUDIO])
  .then((keys) => keys.map(([, id]) => id)).catch(() => [])
export const savedAudioGet = (poemId, id) => tx('readonly', (s) => s.get([Number(poemId), id]), [AUDIO])
  .catch(() => undefined)
export const savedAudioPut = (poem, recitation) => tx('readwrite', (s, t) => {
  s.put(poem)
  return t.objectStore(AUDIO).put(recitation)
}, [STORE, AUDIO])
export const savedAudioDelete = (poemId, id) => tx('readwrite', (s) => s.delete([Number(poemId), id]), [AUDIO])
