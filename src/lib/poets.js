// Pure helpers for the poets list: era filter, compact years, letter groups (unit tested).
import { normalize, toFaDigits } from './poem.js'

export const ERAS = [
  ['all', 'همه'],
  ['3-5', 'سدهٔ ۳ تا ۵'],
  ['6-8', 'سدهٔ ۶ تا ۸'],
  ['9-12', 'سدهٔ ۹ تا ۱۲'],
  ['modern', 'معاصر'],
  ['famous', 'پرخواننده\u200cها'],
]

/**
 * Era key of a poet by the lunar-hijri century of death (birth + 50 when only birth is known); '' when unknown.
 * Centuries 1-5 fall in '3-5' and 13 onward in 'modern', so every dated poet lands in exactly one era chip.
 */
export function eraOf(p) {
  const y = p.deathYearInLHijri || (p.birthYearInLHijri ? p.birthYearInLHijri + 50 : 0)
  if (!y) return ''
  const c = Math.ceil(y / 100)
  return c <= 5 ? '3-5' : c <= 8 ? '6-8' : c <= 12 ? '9-12' : 'modern'
}

/** Poets matching an era key ('all', an era, or 'famous' = pinned, in pin order). */
export function filterEra(poets, era) {
  if (era === 'famous') return poets.filter((p) => p.pinOrder > 0).sort((a, b) => a.pinOrder - b.pinOrder)
  return era === 'all' ? poets : poets.filter((p) => eraOf(p) === era)
}

/** "۷۲۶–۷۹۲ ق", with ؟ for an unknown end; '' when both are unknown. */
export function compactYears(p, sep = '–') {
  const b = p.birthYearInLHijri
  const d = p.deathYearInLHijri
  if (!b && !d) return ''
  return `${b ? toFaDigits(b) : '؟'}${sep}${d ? toFaDigits(d) : '؟'} ق`
}

export const displayName = (p) => p.nickname || p.name || ''

/** First letter for the index; آ files under ا as in Persian dictionaries. */
export const letterOf = (name) => normalize(name).replace(/^آ/, 'ا').charAt(0) || '#'

/** [{letter, items}] in Persian alphabetical order. */
export function byLetter(poets) {
  const sorted = [...poets].sort((a, b) => normalize(displayName(a)).localeCompare(normalize(displayName(b)), 'fa'))
  const groups = []
  for (const p of sorted) {
    const l = letterOf(displayName(p))
    if (groups.at(-1)?.letter !== l) groups.push({ letter: l, items: [] })
    groups.at(-1).items.push(p)
  }
  return groups
}
