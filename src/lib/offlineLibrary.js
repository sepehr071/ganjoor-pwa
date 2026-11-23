import { isNative } from './native.js'
import { normalize } from './poem.js'

const DB = 'beyt-library'
const SCHEMA = 1
const STORES = ['packs', 'categories', 'poems']
const ROOT = isNative ? 'https://sepehr071.github.io/ganjoor-pwa/' : import.meta.env.BASE_URL
const MANIFEST = import.meta.env.VITE_OFFLINE_CATALOG_URL || `${ROOT}offline-packs/manifest.json`
const HAFEZ_GHAZALS = 24
const asText = (poem) => poem.plainText ?? poem.verses?.map((verse) => verse.text).join('\n') ?? ''

function open() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, SCHEMA)
    request.onupgradeneeded = () => {
      const db = request.result
      db.createObjectStore('packs', { keyPath: 'id' })
      db.createObjectStore('categories', { keyPath: 'id' }).createIndex('poetId', 'poetId')
      const poems = db.createObjectStore('poems', { keyPath: 'id' })
      poems.createIndex('poetId', 'poetId')
      poems.createIndex('catId', 'catId')
      poems.createIndex('poetPoem', ['poetId', 'id'])
    }
    let blocked = false
    request.onblocked = () => {
      blocked = true
      reject(new Error('Offline library database is busy'))
    }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      if (blocked) db.close()
      else {
        db.onversionchange = () => db.close()
        resolve(db)
      }
    }
  })
}

async function transaction(stores, mode, run, signal) {
  const db = await open()
  try {
    if (signal?.aborted) throw signal.reason
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode)
      let result
      const abort = () => { try { tx.abort() } catch {} }
      const cleanup = () => signal?.removeEventListener('abort', abort)
      signal?.addEventListener('abort', abort, { once: true })
      tx.onabort = () => {
        cleanup()
        reject(signal?.reason || tx.error || new Error('Offline library transaction aborted'))
      }
      tx.oncomplete = () => {
        cleanup()
        resolve(result)
      }
      try {
        run(tx, (value) => { result = value })
      } catch (error) {
        cleanup()
        abort()
        reject(error)
      }
    })
  } finally {
    db.close()
  }
}

const requestResult = (request, done) => { request.onsuccess = () => done(request.result) }

function readStore(store, method, key) {
  return transaction([store], 'readonly', (tx, done) => {
    requestResult(tx.objectStore(store)[method](key), done)
  })
}

export const installedPacks = () => readStore('packs', 'getAll')

export async function offlineManifest(signal) {
  const response = await fetch(MANIFEST, { signal, cache: 'no-cache' })
  if (!response.ok) throw Object.assign(new Error(`Offline catalog HTTP ${response.status}`), { status: response.status })
  const manifest = await response.json()
  if (manifest.schema !== SCHEMA || typeof manifest.version !== 'string' || !Array.isArray(manifest.packs)
    || !manifest.packs.length || manifest.packs.some((p) => !Number.isSafeInteger(p.id) || p.id <= 0
      || typeof p.name !== 'string' || !/^[\w.-]+\.json\.gz$/.test(p.file)
      || (p.decodedBytes != null && (!Number.isSafeInteger(p.decodedBytes) || p.decodedBytes <= 0))
      || !Number.isSafeInteger(p.bytes) || p.bytes <= 0 || !Number.isSafeInteger(p.poems) || p.poems <= 0)) {
    throw new Error('Invalid offline catalog')
  }
  return { ...manifest, url: response.url || new URL(MANIFEST, location.href).href }
}

function removeRecords(store, id, write = () => {}) {
  requestResult(store.index('poetId').getAllKeys(id), (keys) => {
    for (const key of keys) store.delete(key)
    write(store)
  })
}

export function removeOfflinePack(id) {
  return transaction(STORES, 'readwrite', (tx) => {
    tx.objectStore('packs').delete(id)
    for (const name of STORES.slice(1)) removeRecords(tx.objectStore(name), id)
  })
}

function savePack(info, version, { poet, cats, poems }, signal) {
  const catRecords = new Map(cats.map((cat) => [cat.id, { ...cat, poetId: poet.id, children: [], poems: [] }]))
  for (const cat of catRecords.values()) {
    const parent = catRecords.get(cat.ancestors.at(-1)?.id)
    parent?.children.push({ id: cat.id, title: cat.title })
  }
  for (const poem of poems) {
    catRecords.get(poem.catId).poems.push({ id: poem.id, title: poem.title, excerpt: poem.verses?.[0]?.text || poem.plainText?.split('\n')[0] })
  }
  return transaction(STORES, 'readwrite', (tx) => {
    tx.objectStore('packs').put({ ...info, version, poet })
    removeRecords(tx.objectStore('categories'), poet.id, (store) => {
      for (const cat of catRecords.values()) store.add(cat)
    })
    removeRecords(tx.objectStore('poems'), poet.id, (store) => {
      for (const poem of poems) store.add(poem)
    })
  }, signal)
}

export async function downloadOfflinePack(manifest, pack, { signal, onProgress, onSaving } = {}) {
  const response = await fetch(new URL(pack.file, manifest.url), { signal })
  if (!response.ok || !response.body) throw new Error(`Offline pack HTTP ${response.status}`)
  const decoded = response.headers.get('Content-Encoding')?.toLowerCase() === 'gzip'
  const total = decoded ? pack.decodedBytes : pack.bytes
  let received = 0
  const bytes = response.body.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      received += chunk.byteLength
      if (total) onProgress?.(Math.floor(Math.min(received / total, 1) * pack.bytes))
      controller.enqueue(chunk)
    },
  }))
  // Static hosts usually serve .gz files as bytes. Honor HTTP decoding when the host supplies it.
  const body = decoded ? bytes : bytes.pipeThrough(new DecompressionStream('gzip'))
  const data = await new Response(body).json()
  if (signal?.aborted) throw signal.reason
  const catIds = new Set(data.cats?.map((c) => c.id))
  if (data.poet?.id !== pack.id || !catIds.has(data.poet.rootCatId) || data.poems?.length !== pack.poems
    || data.poems.some((p) => p.poetId !== pack.id || !catIds.has(p.catId))) {
    throw new Error('Offline pack does not match its catalog entry')
  }
  onSaving?.()
  await savePack(pack, manifest.version, data, signal)
}

const available = (promise) => promise.then((value) => value ?? null).catch(() => null)

export const offlinePoets = () => available(installedPacks().then((packs) => packs.length ? packs.map((p) => p.poet) : null))

export const offlinePoet = (id) => available(transaction(['packs', 'categories'], 'readonly', (tx, done) => {
  requestResult(tx.objectStore('packs').get(Number(id)), (pack) => {
    if (pack) requestResult(tx.objectStore('categories').get(pack.poet.rootCatId), (cat) => done({ poet: pack.poet, cat }))
  })
}))

export const offlineCategory = (id) => available(transaction(['packs', 'categories'], 'readonly', (tx, done) => {
  requestResult(tx.objectStore('categories').get(Number(id)), (cat) => {
    if (cat) requestResult(tx.objectStore('packs').get(cat.poetId), (pack) => done({ poet: pack.poet, cat }))
  })
}))

function readPoem(tx, poem, done) {
  if (!poem) return
  requestResult(tx.objectStore('packs').get(poem.poetId), (pack) => {
    requestResult(tx.objectStore('categories').get(poem.catId), (cat) => {
      const { poems, children, ...info } = cat
      done({ ...poem, plainText: asText(poem), category: { poet: pack.poet, cat: info }, _fromPack: true })
    })
  })
}

export const offlinePoem = (id) => available(transaction(STORES, 'readonly', (tx, done) => {
  requestResult(tx.objectStore('poems').get(Number(id)), (poem) => readPoem(tx, poem, done))
}))

function randomPoem(index, key) {
  return available(transaction(STORES, 'readonly', (tx, done) => {
    const poems = tx.objectStore('poems')
    const source = index ? poems.index(index) : poems
    requestResult(source.count(key), (count) => {
      if (!count) return
      const offset = Math.floor(Math.random() * count)
      let first = true
      requestResult(source.openCursor(key), (cursor) => {
        if (!cursor) return
        if (first && offset) {
          first = false
          cursor.advance(offset)
        } else readPoem(tx, cursor.value, done)
      })
    })
  }))
}

export const offlineFaal = () => randomPoem('catId', HAFEZ_GHAZALS)
export const offlineRandom = (poetId) => Number(poetId) ? randomPoem('poetId', Number(poetId)) : randomPoem()

export function offlineSearch(term, page, pageSize, poetId, { signal } = {}) {
  const query = normalize(term)
  if (!query) return Promise.resolve(null)
  return available(transaction(['poems'], 'readonly', (tx, done) => {
    const poems = tx.objectStore('poems')
    const scope = Number(poetId)
    const source = scope ? poems.index('poetPoem') : poems
    const start = (page - 1) * pageSize
    const data = []
    const batch = 128
    let count = 0
    let browsed = false
    const scan = (after) => {
      const range = scope
        ? IDBKeyRange.bound([scope, after], [scope, Number.MAX_SAFE_INTEGER], true)
        : IDBKeyRange.lowerBound(after, true)
      requestResult(source.getAll(range, batch), (rows) => {
        browsed ||= rows.length > 0
        for (const poem of rows) {
          const { id, title, fullTitle } = poem
          const plainText = asText(poem)
          if (normalize(`${title} ${plainText}`).includes(query) && count++ >= start) data.push({ id, title, fullTitle, plainText })
          if (data.length > pageSize) break
        }
        if (rows.length === batch && data.length <= pageSize) scan(rows.at(-1).id)
        else if (browsed) done({ data: data.slice(0, pageSize), paging: { hasNextPage: data.length > pageSize }, offline: true })
      })
    }
    scan(0)
  }, signal))
}
