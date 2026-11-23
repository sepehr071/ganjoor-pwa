import { BASE } from './base.js'

let collection

function dailyPoems() {
  collection ??= fetch(`${BASE}daily-poems.json`)
    .then((response) => {
      if (!response.ok) throw new Error('Daily collection is unavailable')
      return response.json()
    })
    .catch((error) => {
      collection = undefined
      throw error
    })
  return collection
}

export function dailyPoemIndex(date, count) {
  const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
  return ((day % count) + count) % count
}

export async function todayPoem() {
  const poems = await dailyPoems()
  const poem = poems[dailyPoemIndex(new Date(), poems.length)]
  return { id: poem.id, title: poem.fullTitle, poet: poem.poet, couplet: poem.couplet }
}

export async function dailyPoemById(id) {
  const poems = await dailyPoems()
  const poem = poems.find((entry) => entry.id === Number(id))
  if (!poem) return null
  return { ...poem, category: { poet: { nickname: poem.poet } } }
}
