// One global audio element and its state. Poem pages call play(); the sticky <Player> and the highlighted couplet read state.
import { useEffect, useState } from 'preact/hooks'
import { getPoem, getVerseTiming } from '../api.js'
import { coupletStarts, currentCouplet, groupCouplets, poetName } from './poem.js'
import { savedAudioGet, savedPoemGet } from './store.js'

const audio = typeof Audio !== 'undefined' ? new Audio() : null
if (audio) audio.preload = 'none'
const PLAYBACK_START_TIMEOUT = 12000

let state = {
  poem: null, // {id, title, poet, next, couplets, recs}
  recIdx: 0,
  playing: false,
  loading: false,
  error: false,
  time: 0,
  dur: 0,
  rate: 1,
  starts: null,
  couplet: -1,
  autoNext: false,
}
const subs = new Set()
let navigate = () => {}
let playRequest = 0
let objectUrl
let playbackStartTimer
let requestedCouplet = -1
export const setNavigator = (fn) => (navigate = fn)

function set(patch) {
  const previous = state
  state = { ...state, ...patch }
  subs.forEach((f) => f(state))
  syncMediaSession(previous)
}
const all = (s) => s
export function usePlayer(select = all) {
  const [s, setS] = useState(() => select(state))
  useEffect(() => {
    let value = select(state)
    const listener = (next) => {
      const selected = select(next)
      if (selected !== value) setS((value = selected))
    }
    subs.add(listener)
    setS(value)
    return () => subs.delete(listener)
  }, [select])
  return s
}

async function loadTiming(poem, rec, saved) {
  if (!rec.inSyncWithText) return null
  try {
    return coupletStarts(poem.couplets, saved?.timing || await getVerseTiming(rec.id, { timeout: 5000 }))
  } catch {
    return null
  }
}

function clearAudioSource() {
  audio.pause()
  audio.removeAttribute('src')
  audio.load()
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrl = undefined
}

function failPlayback(request) {
  if (request !== playRequest) return
  playRequest++
  clearTimeout(playbackStartTimer)
  clearAudioSource()
  set({ loading: false, error: true, playing: false })
}

function watchPlaybackStart(request) {
  clearTimeout(playbackStartTimer)
  playbackStartTimer = setTimeout(() => failPlayback(request), PLAYBACK_START_TIMEOUT)
}

/** Start a recitation of `poem` ({id,title,poet,next,couplets,recs}); recIdx picks the reciter. */
export async function play(poem, recIdx = 0, startAtCouplet = -1) {
  if (!audio) return
  const rec = poem.recs[recIdx]
  if (!rec) return
  const request = ++playRequest
  requestedCouplet = startAtCouplet
  clearAudioSource()
  set({ poem, recIdx, playing: false, loading: true, error: false, time: 0, dur: 0, couplet: -1, starts: null })
  watchPlaybackStart(request)
  const saved = await savedAudioGet(poem.id, rec.id)
  if (request !== playRequest) return
  if (saved) objectUrl = URL.createObjectURL(saved.blob)
  audio.src = objectUrl || rec.mp3Url
  audio.playbackRate = state.rate
  const updateTiming = loadTiming(poem, rec, saved).then((starts) => {
    if (request !== playRequest) return
    if (startAtCouplet >= 0 && Number.isFinite(starts?.[startAtCouplet])) {
      audio.currentTime = starts[startAtCouplet] / 1000
    }
    set({ starts, couplet: currentCouplet(starts, audio.currentTime * 1000) })
  })
  try {
    if (startAtCouplet >= 0) await updateTiming
    if (request !== playRequest) return
    await audio.play()
  } catch {
    failPlayback(request)
  }
}

export function toggle() {
  if (!audio || !state.poem) return
  if (state.error) return play(state.poem, state.recIdx, requestedCouplet)
  if (!audio.getAttribute('src') || (state.loading && !state.playing)) return
  const request = playRequest
  if (audio.paused) {
    set({ loading: true })
    watchPlaybackStart(request)
    audio.play().catch(() => failPlayback(request))
  } else audio.pause()
}
export function seek(sec) {
  if (!audio || !Number.isFinite(sec)) return
  audio.currentTime = sec
  const time = audio.currentTime
  set({ time, couplet: currentCouplet(state.starts, time * 1000) })
}
export function setRate(rate) {
  if (audio) audio.playbackRate = rate
  set({ rate })
}
export const setAutoNext = (autoNext) => set({ autoNext })
export function stop() {
  if (!audio) return
  playRequest++
  clearTimeout(playbackStartTimer)
  clearAudioSource()
  set({ poem: null, playing: false, time: 0, dur: 0, couplet: -1, starts: null, loading: false, error: false })
}

async function playNext() {
  const next = state.poem?.next
  if (!next) return
  const request = playRequest
  try {
    const p = await getPoem(next.id).catch(async (error) => {
      const saved = await savedPoemGet(next.id)
      if (saved) return saved
      throw error
    })
    if (request !== playRequest) return
    const recs = (p.recitations || []).filter((r) => r.mp3Url)
    if (!recs.length) return
    const artist = state.poem.recs[state.recIdx]?.audioArtist
    const idx = Math.max(0, recs.findIndex((r) => r.audioArtist === artist))
    navigate('/poem/' + p.id)
    await play(
      { id: p.id, title: p.fullTitle, poet: poetName(p), next: p.next, couplets: groupCouplets(p.verses), recs },
      idx,
    )
  } catch {
    if (request === playRequest) set({ error: true })
  }
}

if (audio) {
  audio.addEventListener('pause', () => {
    if (!state.playing || !audio.paused) return
    clearTimeout(playbackStartTimer)
    set({ playing: false, loading: false })
  })
  audio.addEventListener('waiting', () => state.poem && !audio.paused && set({ loading: true }))
  audio.addEventListener('playing', () => {
    if (!state.poem || audio.paused) return
    clearTimeout(playbackStartTimer)
    set({ playing: true, loading: false, error: false })
  })
  audio.addEventListener('error', () => state.poem && audio.error && failPlayback(playRequest))
  audio.addEventListener('loadedmetadata', () => set({ dur: audio.duration }))
  audio.addEventListener('timeupdate', () => {
    const c = currentCouplet(state.starts, audio.currentTime * 1000)
    set({ time: audio.currentTime, dur: audio.duration || state.dur, couplet: c })
  })
  audio.addEventListener('ended', () => {
    if (!state.poem || !audio.ended) return
    set({ playing: false, loading: false })
    if (state.autoNext) playNext()
  })
}

function syncMediaSession(previous) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
  const changedTrack = state.poem !== previous.poem || state.recIdx !== previous.recIdx
  const session = navigator.mediaSession
  try {
    if (changedTrack) {
      session.metadata = state.poem ? new MediaMetadata({
        title: state.poem.title,
        artist: state.poem.recs[state.recIdx]?.audioArtist || '',
        album: state.poem.poet || 'بیت',
      }) : null
    }
    if (changedTrack || state.playing !== previous.playing) {
      session.playbackState = state.poem ? (state.playing ? 'playing' : 'paused') : 'none'
    }
  } catch {}
}

if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
  const h = (a, f) => {
    try {
      navigator.mediaSession.setActionHandler(a, f)
    } catch {}
  }
  h('play', () => { if (audio.paused) toggle() })
  h('pause', () => audio.pause())
  h('stop', stop)
  h('seekto', (d) => d.seekTime != null && seek(d.seekTime))
  h('seekbackward', () => seek(Math.max(0, audio.currentTime - 10)))
  h('seekforward', () => seek(audio.currentTime + 10))
  h('nexttrack', () => state.poem?.next && playNext())
}
