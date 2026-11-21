import { describe, it, expect } from 'vitest'
import {
  normalize,
  groupCouplets,
  coupletsFromPlain,
  coupletStarts,
  currentCouplet,
  parseMeaning,
  meterOf,
  toFaDigits,
} from './poem.js'

const verses = [
  { vOrder: 1, coupletIndex: 0, versePosition: 0, text: 'الف', coupletSummary: 'معنی ۱' },
  { vOrder: 2, coupletIndex: 0, versePosition: 1, text: 'ب', coupletSummary: null },
  { vOrder: 3, coupletIndex: 1, versePosition: 0, text: 'پ', coupletSummary: null },
  { vOrder: 4, coupletIndex: 1, versePosition: 1, text: 'ت', coupletSummary: null },
]

describe('normalize', () => {
  it('unifies Arabic letters, strips diacritics and ZWNJ', () => {
    expect(normalize('كتاب  يك')).toBe('کتاب یک')
    expect(normalize('زاهدِ خلوت\u200cنشین')).toBe('زاهد خلوت نشین')
  })
})

describe('groupCouplets', () => {
  it('pairs hemistichs by coupletIndex and keeps the summary', () => {
    const c = groupCouplets(verses)
    expect(c).toHaveLength(2)
    expect(c[0]).toMatchObject({ a: 'الف', b: 'ب', single: false, summary: 'معنی ۱', vOrders: [1, 2] })
  })
  it('marks a lone verse as single', () => {
    const c = groupCouplets([{ vOrder: 1, coupletIndex: 0, versePosition: 4, text: 'x' }])
    expect(c[0].single).toBe(true)
  })
  it('groups plain text lines in pairs', () => {
    expect(coupletsFromPlain('a\r\nb\r\nc\r\nd\r\ne')).toEqual([
      { index: 0, a: 'a', b: 'b' },
      { index: 1, a: 'c', b: 'd' },
      { index: 2, a: 'e', b: '' },
    ])
  })
})

describe('timing mapping', () => {
  const couplets = groupCouplets(verses)
  const timing = [
    { verseOrder: 0, audioStartMilliseconds: 0 },
    { verseOrder: 1, audioStartMilliseconds: 0 },
    { verseOrder: 2, audioStartMilliseconds: 4000 },
    { verseOrder: 3, audioStartMilliseconds: 9000 },
    { verseOrder: 4, audioStartMilliseconds: 12000 },
  ]
  it('takes the first verse of each couplet', () => {
    expect(coupletStarts(couplets, timing)).toEqual([0, 9000])
  })
  it('returns null when a couplet has no timing', () => {
    expect(coupletStarts(couplets, timing.slice(0, 3))).toBeNull()
    expect(coupletStarts(couplets, [])).toBeNull()
  })
  it('finds the current couplet', () => {
    const s = [0, 9000, 20000]
    expect(currentCouplet(s, 0)).toBe(0)
    expect(currentCouplet(s, 8999)).toBe(0)
    expect(currentCouplet(s, 9000)).toBe(1)
    expect(currentCouplet(s, 99999)).toBe(2)
    expect(currentCouplet(null, 5)).toBe(-1)
  })
})

describe('misc', () => {
  it('labels AI meanings', () => {
    expect(parseMeaning('هوش مصنوعی: سلام')).toEqual({ ai: true, text: 'سلام' })
    expect(parseMeaning('سلام')).toEqual({ ai: false, text: 'سلام' })
    expect(parseMeaning(null)).toBeNull()
  })
  it('reads meter and rhyme', () => {
    expect(meterOf({ sections: [{ ganjoorMetre: { id: 15, rhythm: 'r' }, rhymeLetters: 'انه' }] })).toEqual({
      id: 15,
      rhythm: 'r',
      rhyme: 'انه',
    })
    expect(meterOf({ sections: [] })).toBeNull()
  })
  it('converts digits', () => expect(toFaDigits(170)).toBe('۱۷۰'))
})
