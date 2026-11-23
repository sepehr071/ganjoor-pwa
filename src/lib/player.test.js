import { afterEach, beforeEach, expect, it, vi } from 'vitest'

let player
let audio

class TestAudio extends EventTarget {
  paused = true
  src = ''
  currentTime = 0
  canPlay = false
  rejectPending

  constructor() {
    super()
    audio = this
  }

  play() {
    this.paused = false
    if (!this.canPlay) return new Promise((_, reject) => { this.rejectPending = reject })
    this.dispatchEvent(new Event('playing'))
    return Promise.resolve()
  }

  pause() {
    this.paused = true
  }

  removeAttribute() {
    this.src = ''
  }

  getAttribute() {
    return this.src || null
  }

  load() {
    this.rejectPending?.(new Error('Source removed'))
    this.rejectPending = undefined
  }
}

const poem = {
  id: 1,
  title: 'Poem',
  couplets: [],
  recs: [{ id: 7, mp3Url: 'https://i.ganjoor.net/a/example.mp3' }],
}

beforeEach(async () => {
  vi.useFakeTimers()
  vi.resetModules()
  vi.stubGlobal('Audio', TestAudio)
  player = await import('./player.js')
})

afterEach(() => {
  player.stop()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('cancels a stalled stream and retries the same recording', async () => {
  const first = player.play(poem)
  await vi.advanceTimersByTimeAsync(0)
  expect(audio.src).toBe(poem.recs[0].mp3Url)

  await vi.advanceTimersByTimeAsync(12000)
  await first
  expect(audio.src).toBe('')
  expect(audio.paused).toBe(true)

  audio.canPlay = true
  await player.toggle()
  await vi.advanceTimersByTimeAsync(12000)
  expect(audio.src).toBe(poem.recs[0].mp3Url)
  expect(audio.paused).toBe(false)
})

it('stopping a pending stream clears it and prevents retry', async () => {
  const first = player.play(poem)
  await vi.advanceTimersByTimeAsync(0)
  player.stop()
  await first
  await vi.advanceTimersByTimeAsync(12000)
  player.toggle()
  expect(audio.src).toBe('')
  expect(audio.paused).toBe(true)
})
