import { describe, it, expect } from 'vitest'
import { parsePaging, buildUrl } from './api.js'
import {
  layoutTree, makeProjector, fitBounds, IRAN_BOUNDS, regionOf, normalizeFa, barPercents, firstCouplet, thumbUrl,
} from './util.js'

const P = (id, gender = 1) => ({ id, gender })
const R = (a, b, t = 0) => ({ person1Id: a, person2Id: b, relationType: t })

describe('parsePaging', () => {
  it('parses the paging-headers JSON', () => {
    const p = parsePaging('{"totalCount":210,"pageSize":2,"currentPage":1,"totalPages":105,"hasPreviousPage":false,"hasNextPage":true}')
    expect(p).toEqual({ total: 210, pageSize: 2, page: 1, pages: 105, hasNext: true, hasPrev: false })
  })
  it('returns null for missing or broken input', () => {
    expect(parsePaging(null)).toBeNull()
    expect(parsePaging('{oops')).toBeNull()
  })
})

describe('buildUrl', () => {
  it('skips empty params and encodes the rest', () => {
    const u = buildUrl('/x', { a: 'یک', b: '', c: undefined, d: 0 })
    expect(u).toBe('https://api.ganjoor.net/api/x?a=%DB%8C%DA%A9&d=0')
  })
})

describe('layoutTree', () => {
  const persons = [P(1), P(2), P(3), P(4, 2), P(5)]
  it('places a simple tree by depth and centres parents on their children', () => {
    const t = layoutTree(persons, [R(1, 2), R(1, 3), R(2, 5)])
    const n = Object.fromEntries(t.nodes.map((x) => [x.id, x]))
    expect([n[1].depth, n[2].depth, n[3].depth, n[5].depth]).toEqual([0, 1, 1, 2])
    expect(n[5].row).toBe(0)
    expect(n[3].row).toBe(1)
    expect(n[2].row).toBe(0)
    expect(n[1].row).toBe(0.5)
    expect(t.depths).toBe(3)
  })
  it('keeps one spine parent (the father) and returns the other as an extra edge', () => {
    const t = layoutTree([P(1), P(4, 2), P(9)], [R(4, 9), R(1, 9)])
    expect(t.edges.find((e) => e.from === 1 && e.to === 9).kind).toBe('spine')
    expect(t.edges.find((e) => e.from === 4 && e.to === 9).kind).toBe('extra')
  })
  it('marks distant-ancestor links and ignores unknown people and cycles', () => {
    const t = layoutTree([P(1), P(2)], [R(1, 2, 3), R(2, 1), R(1, 99)])
    expect(t.edges.some((e) => e.kind === 'ancestor')).toBe(true)
    expect(t.nodes).toHaveLength(2)
  })
})

describe('map projection', () => {
  it('maps bounds corners to the viewport corners', () => {
    const pr = makeProjector(IRAN_BOUNDS, 800)
    expect(pr.project(IRAN_BOUNDS.maxLat, IRAN_BOUNDS.minLon)).toEqual({ x: 0, y: 0 })
    const br = pr.project(IRAN_BOUNDS.minLat, IRAN_BOUNDS.maxLon)
    expect(br.x).toBeCloseTo(800)
    expect(br.y).toBeCloseTo(pr.height)
  })
  it('puts Shiraz inside the default map and widens bounds for far places', () => {
    const pr = makeProjector(IRAN_BOUNDS, 800)
    const s = pr.project(29.5926, 52.5836)
    expect(s.x).toBeGreaterThan(0)
    expect(s.x).toBeLessThan(800)
    const b = fitBounds([{ lat: 27.18, lon: 78.02 }])
    expect(b.maxLon).toBeGreaterThanOrEqual(78.02)
    expect(b.minLon).toBe(IRAN_BOUNDS.minLon)
  })
})

describe('regionOf', () => {
  it('buckets known cities', () => {
    expect(regionOf(29.59, 52.58)).toBe('ایران')
    expect(regionOf(39.627, 66.975)).toBe('ماوراءالنهر و افغانستان')
    expect(regionOf(27.18, 78.02)).toBe('هند')
    expect(regionOf(33.3, 44.4)).toBe('عراق، شام و حجاز')
  })
})

describe('text helpers', () => {
  it('normalizes Arabic letters, ZWNJ, diacritics and digits', () => {
    expect(normalizeFa('مُتقارب  مثمن')).toBe('متقارب مثمن')
    expect(normalizeFa('\u0643تاب\u200Cها')).toBe('کتاب ها')
    expect(normalizeFa('غزل ۱۷۰')).toBe('غزل 170')
  })
  it('scales bars to the max and handles empties', () => {
    expect(barPercents([50, 25, 0])).toEqual([100, 50, 1])
    expect(barPercents([])).toEqual([])
    expect(barPercents([0, 0])).toEqual([0, 0])
  })
  it('splits a couplet and derives thumbnails', () => {
    expect(firstCouplet('a\r\nb\r\nc\r\nd')).toEqual(['a', 'b'])
    expect(thumbUrl('https://i.ganjoor.net/images/x/norm/0001.jpg')).toBe('https://i.ganjoor.net/images/x/thumb/0001.jpg')
  })
})
