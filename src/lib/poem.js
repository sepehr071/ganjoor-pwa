// Pure helpers for poems. No DOM, no network (unit tested).

const AI_PREFIX = /^\s*هوش مصنوعی\s*[:：]\s*/

/** Arabic letters to Persian, strip diacritics/tatweel, ZWNJ to space, collapse whitespace. For filtering and matching. */
export function normalize(s = '') {
  return String(s)
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[\u200c‍]/g, " ")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export const toFaDigits = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])

/** Split an AI label off a summary: «هوش مصنوعی: ...» becomes {ai: true, text: '...'}. */
export function parseMeaning(s) {
  if (!s) return null
  const ai = AI_PREFIX.test(s)
  return { ai, text: s.replace(AI_PREFIX, '').trim() }
}

/**
 * Group API verses into couplets. versePosition: 0 right hemistich, 1 left hemistich,
 * 2/3 centered, 4 single/paragraph, 5 comment. A couplet with one verse is `single`.
 */
export function groupCouplets(verses = []) {
  const map = new Map()
  for (const v of verses) {
    const key = v.coupletIndex ?? v.vOrder
    let c = map.get(key)
    if (!c) {
      c = { index: key, a: '', b: '', single: false, summary: null, vOrders: [], position: v.versePosition }
      map.set(key, c)
    }
    c.vOrders.push(v.vOrder)
    if (v.coupletSummary && !c.summary) c.summary = v.coupletSummary
    if (v.versePosition === 1 || v.versePosition === 3) c.b = v.text
    else if (!c.a) c.a = v.text
    else c.b = v.text
  }
  return [...map.values()]
    .sort((x, y) => x.vOrders[0] - y.vOrders[0])
    .map((c) => ({ ...c, single: !c.b || c.position >= 4 }))
}

/** Same grouping from plain text lines (random poem has no verses): consecutive line pairs. */
export function coupletsFromPlain(text = '') {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const out = []
  for (let i = 0; i < lines.length; i += 2) out.push({ index: i / 2, a: lines[i], b: lines[i + 1] || '' })
  return out
}

/** Start time (ms) per couplet from /audio/verses timing, or null when the recitation has no usable timing. */
export function coupletStarts(couplets, timing) {
  if (!Array.isArray(timing) || !timing.length) return null
  const byOrder = new Map(timing.map((t) => [t.verseOrder, t.audioStartMilliseconds]))
  const starts = couplets.map((c) => byOrder.get(c.vOrders[0]))
  return starts.every((s) => typeof s === 'number') ? starts : null
}

/** Index of the couplet being recited at `ms`, or -1 before the first. */
export function currentCouplet(starts, ms) {
  if (!starts) return -1
  let lo = -1
  for (let i = 0; i < starts.length; i++) {
    if (starts[i] <= ms) lo = i
    else break
  }
  return lo
}

/** Meter and rhyme from poem.sections (needs rhymes=true). */
export function meterOf(poem) {
  const s = (poem?.sections || []).find((x) => x.ganjoorMetre || x.rhymeLetters)
  if (!s) return null
  return {
    id: s.ganjoorMetre?.id ?? null,
    rhythm: s.ganjoorMetre?.rhythm ?? null,
    rhyme: s.rhymeLetters || null,
  }
}

/** Keep the ranges when different sections of one poem have different metres or rhymes. */
export function sectionMeters(poem) {
  const sections = poem?.sections || []
  const byIndex = new Map(sections.map((section) => [section.index, section]))
  const meters = sections.flatMap((section) => {
    const metre = section.ganjoorMetre || byIndex.get(section.ganjoorMetreRefSectionIndex)?.ganjoorMetre
    const rhythm = metre?.rhythm || null
    const rhyme = section.rhymeLetters || null
    if (!rhythm && !rhyme) return []
    const first = section.cachedFirstCoupletIndex
    const count = section.coupletsCount
    const range = Number.isInteger(first) && first >= 0 && count > 0 ? [first + 1, first + count] : null
    return [{ id: metre?.id, rhythm, rhyme, range }]
  })
  const unique = new Map(meters.map((m) => [JSON.stringify([m.rhythm, m.rhyme, m.range]), m]))
  const signatures = new Set(meters.map((m) => JSON.stringify([m.rhythm, m.rhyme])))
  return signatures.size > 1 ? [...unique.values()] : meters.slice(0, 1)
}

export const coupletText = (c) => (c.single || !c.b ? c.a : `${c.a}\n${c.b}`)

/** Plain-text share/copy payload for a whole poem. */
export function poemText(poem, couplets) {
  return `${poem.fullTitle}\n\n${couplets.map(coupletText).join('\n\n')}\n\nمنبع: گنجور (ganjoor.net${poem.fullUrl})`
}

export const ganjoorUrl = (fullUrl) => 'https://ganjoor.net' + fullUrl

export const poetName = (poem) => poem?.category?.poet?.nickname || poem?.category?.poet?.name || ''

/** Compact record kept in bookmarks/history. */
export function poemRef(poem, couplets) {
  return {
    id: poem.id,
    title: poem.fullTitle || poem.title,
    poet: poetName(poem),
    img: poem.category?.poet?.imageUrl || '',
    excerpt: couplets?.[0] ? coupletText(couplets[0]).replace('\n', ' / ') : '',
    at: Date.now(),
  }
}

export function fmtTime(sec) {
  if (!isFinite(sec)) return '۰:۰۰'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return toFaDigits(`${m}:${String(s).padStart(2, '0')}`)
}
