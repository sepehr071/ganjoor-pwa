// Three most-visited poem pages per featured poet, from Ganjoor's TopVisits lists (2026-11-25).
const POPULAR_SCENES = {
  // Hafez
  2130: 'river', 2134: 'river', 2132: 'garden',
  // Saadi
  41293: 'study', 9590: 'road', 9831: 'garden',
  // Rumi
  3389: 'sky', 7893: 'river', 3065: 'garden',
  // Ferdowsi
  1321: 'sky', 1322: 'study', 1476: 'road',
  // Khayyam
  1125: 'road', 1122: 'river', 1119: 'garden',
  // Baba Taher
  21382: 'road', 21470: 'river', 21331: 'sky',
  // Attar
  34762: 'road', 11902: 'road', 11032: 'study',
  // Shahriar
  27073: 'sky', 146294: 'garden', 27066: 'sky',
}

export function poemArt(id) {
  const poemId = typeof id === 'string' && !/\D/.test(id) ? Number(id) : id
  if (!Number.isSafeInteger(poemId) || poemId < 1) return null

  const scene = POPULAR_SCENES[poemId]
  if (!scene) return null

  const seal = poemId.toString(16).padStart(4, '0').slice(-4)
  return {
    scene,
    x: 29 + (Math.floor(poemId / 7) % 7) * 7,
    y: 75 - (poemId % 7) * 7,
    marks: Array.from(seal, (digit) => Number.parseInt(digit, 16)),
  }
}
