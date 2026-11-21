// One global audio element and its state. Poem pages call play(); the sticky <Player> and the highlighted couplet read state.
import { useEffect, useState } from 'preact/hooks'
import { getPoem, getVerseTiming } from '../api.js'
import { coupletStarts, currentCouplet, groupCouplets, poetName } from './poem.js'

const audio = typeof Audio !== 'undefined' ? new Audio() : null
if (audio) audio.preload = 'none'

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
export const setNavigator = (fn) => (navigate = fn)

function set(patch) {
  state = { ...state, ...patch }
  subs.forEach((f) => f(state))
  syncMediaSession()
}
export const getState = () => state
export function usePlayer() {
  const [s, setS] = useState(state)
  useEffect(() => {
    subs.add(setS)
    setS(state)
    return () => subs.delete(setS)
  }, [])
  return s
}

async function loadTiming(poem, rec) {
  if (!rec.inSyncWithText) return null
  try {
    return coupletStarts(poem.couplets, await getVerseTiming(rec.id))
  } catch {
    return null
  }
}

/** Start a recitation of `poem` ({id,title,poet,next,couplets,recs}); recIdx picks the reciter. */
export async function play(poem, recIdx = 0, startAtCouplet = -1) {
  if (!audio) return
  const rec = poem.recs[recIdx]
  if (!rec) return
  set({ poem, recIdx, loading: true, error: false, time: 0, dur: 0, couplet: -1, starts: null })
  audio.src = rec.mp3Url
  audio.playbackRate = state.rate
  const starts = await loadTiming(poem, rec)
  if (state.poem !== poem || state.recIdx !== recIdx) return
  set({ starts })
  if (startAtCouplet >= 0 && starts) audio.currentTime = starts[startAtCouplet] / 1000
  try {
    await audio.play()
  } catch {
    set({ loading: false, error: true, playing: false })
  }
}

export function toggle() {
  if (!audio?.src) return
  if (audio.paused) audio.play().catch(() => set({ error: true }))
  else audio.pause()
}
export const seek = (sec) => audio && (audio.currentTime = sec)
export function setRate(rate) {
  if (audio) audio.playbackRate = rate
  set({ rate })
}
export const setAutoNext = (autoNext) => set({ autoNext })
export function stop() {
  if (!audio) return
  audio.pause()
  audio.removeAttribute('src')
  audio.load()
  set({ poem: null, playing: false, time: 0, dur: 0, couplet: -1, starts: null, loading: false })
}

async function playNext() {
  const next = state.poem?.next
  if (!next) return
  try {
    const p = await getPoem(next.id)
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
    set({ error: true })
  }
}

if (audio) {
  audio.addEventListener('play', () => set({ playing: true, loading: false, error: false }))
  audio.addEventListener('pause', () => set({ playing: false }))
  audio.addEventListener('waiting', () => set({ loading: true }))
  audio.addEventListener('playing', () => set({ loading: false }))
  audio.addEventListener('error', () => state.poem && set({ error: true, loading: false, playing: false }))
  audio.addEventListener('loadedmetadata', () => set({ dur: audio.duration }))
  audio.addEventListener('timeupdate', () => {
    const c = currentCouplet(state.starts, audio.currentTime * 1000)
    set({ time: audio.currentTime, dur: audio.duration || state.dur, couplet: c })
  })
  audio.addEventListener('ended', () => {
    set({ playing: false })
    if (state.autoNext) playNext()
  })
}

function syncMediaSession() {
  if (!('mediaSession' in navigator) || !state.poem) return
  const rec = state.poem.recs[state.recIdx]
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: state.poem.title,
      artist: rec?.audioArtist || '',
      album: state.poem.poet || 'گنجور',
    })
    navigator.mediaSession.playbackState = state.playing ? 'playing' : 'paused'
  } catch {}
}

if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
  const h = (a, f) => {
    try {
      navigator.mediaSession.setActionHandler(a, f)
    } catch {}
  }
  h('play', toggle)
  h('pause', toggle)
  h('seekto', (d) => d.seekTime != null && seek(d.seekTime))
  h('seekbackward', () => seek(Math.max(0, audio.currentTime - 10)))
  h('seekforward', () => seek(audio.currentTime + 10))
  h('nexttrack', () => state.poem?.next && playNext())
}
