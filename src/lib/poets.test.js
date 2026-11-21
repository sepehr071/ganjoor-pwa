import { describe, expect, it } from 'vitest'
import { eraOf, filterEra, compactYears, byLetter } from './poets.js'

const P = (nickname, birthYearInLHijri, deathYearInLHijri, pinOrder = 0) => ({ nickname, birthYearInLHijri, deathYearInLHijri, pinOrder })

describe('eraOf', () => {
  it('buckets by the century of death', () => {
    expect(eraOf(P('فردوسی', 329, 416))).toBe('3-5')
    expect(eraOf(P('حافظ', 726, 792))).toBe('6-8')
    expect(eraOf(P('جامی', 817, 898))).toBe('9-12')
    expect(eraOf(P('صائب', 1000, 1086))).toBe('9-12')
    expect(eraOf(P('پروین', 1324, 1360))).toBe('modern')
  })
  it('puts century boundaries in the lower era', () => {
    expect(eraOf(P('x', 0, 500))).toBe('3-5')
    expect(eraOf(P('x', 0, 501))).toBe('6-8')
    expect(eraOf(P('x', 0, 1200))).toBe('9-12')
  })
  it('falls back to birth year and handles unknown years', () => {
    expect(eraOf(P('x', 600, 0))).toBe('6-8')
    expect(eraOf(P('x', 0, 0))).toBe('')
    expect(eraOf({})).toBe('')
  })
})

describe('filterEra', () => {
  const list = [P('ب', 0, 792, 2), P('الف', 0, 416, 1), P('پ', 0, 0)]
  it('keeps all, one era, or the pinned poets in pin order', () => {
    expect(filterEra(list, 'all')).toHaveLength(3)
    expect(filterEra(list, '6-8').map((p) => p.nickname)).toEqual(['ب'])
    expect(filterEra(list, 'famous').map((p) => p.nickname)).toEqual(['الف', 'ب'])
  })
})

describe('compactYears', () => {
  it('formats both ends in Persian digits', () => {
    expect(compactYears(P('حافظ', 726, 792))).toBe('۷۲۶–۷۹۲ ق')
    expect(compactYears(P('x', 0, 792))).toBe('؟–۷۹۲ ق')
    expect(compactYears(P('x', 726, 792), ' تا ')).toBe('۷۲۶ تا ۷۹۲ ق')
    expect(compactYears(P('x', 0, 0))).toBe('')
  })
})

describe('byLetter', () => {
  it('groups alphabetically and files آ under ا', () => {
    const g = byLetter([P('حافظ'), P('انوری'), P('آذر'), P('پروین'), P('اوحدی')])
    expect(g.map((x) => x.letter)).toEqual(['ا', 'پ', 'ح'])
    expect(g[0].items.map((p) => p.nickname)).toEqual(['آذر', 'انوری', 'اوحدی'])
  })
})
