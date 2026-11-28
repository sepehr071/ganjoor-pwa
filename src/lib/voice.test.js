import { describe, expect, it } from 'vitest'
import { voicePoemContext } from './voice.js'
import { pilotTokenUrl } from './voiceUrl.js'

describe('live voice pilot', () => {
  it('sends the same couplet the widget displays, with a bounded excerpt', () => {
    const lines = Array.from({ length: 40 }, (_, index) => 'بیت ' + index + ' ' + 'واژه '.repeat(40))
    const poem = {
      fullTitle: 'حافظ » غزل',
      plainText: lines.join('\n'),
      couplet: { a: lines[30].trim(), b: lines[31].trim() },
    }
    const context = voicePoemContext(poem, true)
    expect(context.focus_couplet).toBe([poem.couplet.a, poem.couplet.b].join('\n'))
    expect(context.poem_text).toContain(context.focus_couplet)
    expect(context.poem_text.length).toBeLessThanOrEqual(3000)
    expect(voicePoemContext(poem, false).focus_couplet).toBe(lines.slice(0, 2).map((line) => line.trim()).join('\n'))
    expect(voicePoemContext({ plainText: '' }, false)).toBeNull()
  })

  it('uses HTTPS for a remote pilot endpoint and allows loopback HTTP', () => {
    expect(pilotTokenUrl('https://beyt.example/voice/token')).toBe('https://beyt.example/voice/token')
    expect(pilotTokenUrl('http://127.0.0.1:8787/voice/token')).toBe('http://127.0.0.1:8787/voice/token')
    expect(pilotTokenUrl('http://beyt.example/voice/token')).toBe('')
    expect(pilotTokenUrl('https://secret@beyt.example/voice/token')).toBe('')
    expect(pilotTokenUrl(undefined)).toBe('')
  })
})
