// Pure helpers for the explore section (unit tested in util.test.js).

export const fa = (n) => Number(n || 0).toLocaleString('fa-IR')

// Loose Persian matching: unify Arabic/Persian letters, drop diacritics and ZWNJ, digits to ASCII.
export function normalizeFa(s) {
  return String(s ?? '')
    .replace(/\u064A/g, '\u06CC')
    .replace(/\u0643/g, '\u06A9')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/\u200C/g, ' ')
    .replace(/[\u0660-\u0669]/g, (d) => d.charCodeAt(0) - 0x660)
    .replace(/[\u06F0-\u06F9]/g, (d) => d.charCodeAt(0) - 0x6f0)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export const matches = (text, q) => normalizeFa(text).includes(normalizeFa(q))

// First two lines of a poem's plain text (one couplet).
export function firstCouplet(plain) {
  return String(plain || '').split(/\r?\n/).filter(Boolean).slice(0, 2)
}

// Bar widths (percent) relative to `max` (default: the largest value); min 1% so tiny values stay visible.
export function barPercents(values, max = Math.max(0, ...values)) {
  return values.map((v) => (max ? Math.max(1, Math.round((v / max) * 100)) : 0))
}

// museum thumbnails live next to the normal-size image
export const thumbUrl = (normUrl) => (normUrl ? normUrl.replace('/norm/', '/thumb/') : '')

// Family tree layout. Parent edges are relationType 0 (parent) and 3 (distant ancestor);
// relation direction: person1 is the parent/ancestor of person2.
// Each person gets one "spine" parent (direct over ancestor, then male, then lowest id);
// other parent links come back as `extra` edges. Depth = column, row = vertical slot.
export function layoutTree(persons, relations) {
  const byId = new Map(persons.map((p) => [p.id, p]))
  const parents = new Map()
  for (const r of relations || []) {
    if (r.relationType !== 0 && r.relationType !== 3) continue
    if (!byId.has(r.person1Id) || !byId.has(r.person2Id) || r.person1Id === r.person2Id) continue
    if (!parents.has(r.person2Id)) parents.set(r.person2Id, [])
    parents.get(r.person2Id).push({ id: r.person1Id, type: r.relationType })
  }
  const rank = (e) => [e.type === 0 ? 0 : 1, byId.get(e.id).gender === 1 ? 0 : 1, e.id]
  const spine = new Map()
  for (const [child, list] of parents) {
    const best = [...list].sort((a, b) => {
      const x = rank(a), y = rank(b)
      return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
    })[0]
    spine.set(child, best)
  }
  const children = new Map()
  for (const [child, e] of spine) {
    if (!children.has(e.id)) children.set(e.id, [])
    children.get(e.id).push(child)
  }
  for (const list of children.values()) list.sort((a, b) => a - b)

  const placed = new Map() // id -> {id, depth, row}
  let nextRow = 0
  const visit = (id, depth) => {
    if (placed.has(id)) return placed.get(id).row
    const node = { id, depth, row: 0 }
    placed.set(id, node)
    const kids = (children.get(id) || []).filter((k) => !placed.has(k))
    if (!kids.length) {
      node.row = nextRow++
    } else {
      const rows = kids.map((k) => visit(k, depth + 1))
      node.row = (rows[0] + rows[rows.length - 1]) / 2
    }
    return node.row
  }
  const roots = persons.map((p) => p.id).filter((id) => !spine.has(id)).sort((a, b) => a - b)
  for (const id of roots) visit(id, 0)
  for (const p of persons) visit(p.id, 0) // cycles: anything left over still gets a slot

  const edges = []
  for (const [child, list] of parents) {
    const s = spine.get(child)
    for (const e of list) {
      if (!placed.has(e.id) || !placed.has(child)) continue
      const isSpine = e.id === s.id
      edges.push({ from: e.id, to: child, kind: isSpine ? (e.type === 3 ? 'ancestor' : 'spine') : 'extra' })
    }
  }
  const nodes = [...placed.values()]
  return {
    nodes,
    edges,
    depths: nodes.reduce((m, n) => Math.max(m, n.depth), 0) + 1,
    rows: Math.max(nextRow, 1),
  }
}

// Map projection (equirectangular, cos-corrected) for the places map.
export const IRAN_BOUNDS = { minLat: 24, maxLat: 41, minLon: 43, maxLon: 64 }

export function fitBounds(points, base = IRAN_BOUNDS, pad = 1) {
  const b = { ...base }
  for (const p of points) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue
    b.minLat = Math.min(b.minLat, p.lat - pad)
    b.maxLat = Math.max(b.maxLat, p.lat + pad)
    b.minLon = Math.min(b.minLon, p.lon - pad)
    b.maxLon = Math.max(b.maxLon, p.lon + pad)
  }
  return b
}

export function makeProjector(bounds, width) {
  const k = Math.cos((((bounds.minLat + bounds.maxLat) / 2) * Math.PI) / 180)
  const dLon = bounds.maxLon - bounds.minLon
  const dLat = bounds.maxLat - bounds.minLat
  const height = (width * dLat) / (dLon * k)
  return {
    width,
    height,
    project: (lat, lon) => ({
      x: ((lon - bounds.minLon) / dLon) * width,
      y: ((bounds.maxLat - lat) / dLat) * height,
    }),
  }
}

// Coarse region buckets for grouping places in the list.
export function regionOf(lat, lon) {
  if (lon < 44.9) return 'عراق، شام و حجاز'
  if (lon >= 63.5) return lat >= 34 ? 'ماوراءالنهر و افغانستان' : 'هند'
  return 'ایران'
}

export const REGION_ORDER = ['ایران', 'ماوراءالنهر و افغانستان', 'عراق، شام و حجاز', 'هند']
