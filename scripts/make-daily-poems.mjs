import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { groupCouplets } from '../src/lib/poem.js'

const [source] = process.argv.slice(2)
if (!source) throw new Error('Usage: node scripts/make-daily-poems.mjs <extracted-root>')

const books = ['hafez/ghazal', 'saadi/divan/ghazals', 'moulavi/shams/ghazalsh', 'babataher/2beytiha']
const poems = []
for (let number = 1; number <= 7; number++) {
  for (const book of books) {
    const file = join(source, 'data', book, `${number}.json`)
    const { poem } = JSON.parse(await readFile(file, 'utf8'))
    const { id, title, fullTitle, fullUrl } = poem
    const verses = poem.verses.map(({ vOrder, versePosition, text, coupletIndex }) => ({ vOrder, versePosition, text, coupletIndex }))
    const couplets = groupCouplets(verses).filter((couplet) => !couplet.single)
    const { a, b } = couplets.find(({ a, b }) => a && b && a.length <= 70 && b.length <= 70) ?? {}
    if (!id || !a || !b) throw new Error(`Missing poem or suitable couplet in ${file}`)
    poems.push({ id, title, fullTitle, fullUrl, poet: fullTitle.split('»')[0].trim(), verses, couplet: { a, b } })
  }
}

const json = JSON.stringify(poems, null, 2).replaceAll('\u200c', '\\u200c')
await writeFile(new URL('../public/daily-poems.json', import.meta.url), `${json}\n`)
