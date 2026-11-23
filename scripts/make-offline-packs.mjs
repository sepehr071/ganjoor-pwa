import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'

const SNAPSHOT = 'v2026.1'
const SOURCE = `https://github.com/sajad2025/ganjoor/releases/tag/${SNAPSHOT}`
const EXPECTED_POEMS = 129465

async function* jsonFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* jsonFiles(path)
    else if (entry.name.endsWith('.json') && !entry.name.startsWith('_')) yield path
  }
}

function catInfo({ id, title, fullUrl, description }) {
  return { id, title, fullUrl, description }
}

function poemRef(ref) {
  return ref && { id: ref.id, title: ref.title, excerpt: ref.excerpt }
}

function textPoem(poem) {
  const { id, title, fullTitle, fullUrl, sourceName, next, previous, category, sections } = poem
  const verses = poem.verses?.map(({ vOrder, coupletIndex, versePosition, text }) => ({
    vOrder, coupletIndex, versePosition, text,
  }))
  return {
    id, title, fullTitle, fullUrl, sourceName, verses, catId: category.cat.id, poetId: category.poet.id,
    plainText: verses?.length ? undefined : poem.plainText,
    next: poemRef(next), previous: poemRef(previous),
    sections: sections?.flatMap(({ number, sectionType, rhymeLetters, ganjoorMetre }) => (
      ganjoorMetre?.rhythm || rhymeLetters ? [{ number, sectionType, rhymeLetters,
        ganjoorMetre: ganjoorMetre?.rhythm ? { id: ganjoorMetre.id, rhythm: ganjoorMetre.rhythm } : undefined,
      }] : []
    )),
  }
}

async function readPoet(dir) {
  let poet
  const cats = new Map()
  const poems = new Map()
  for await (const path of jsonFiles(dir)) {
    const { poem } = JSON.parse(await readFile(path, 'utf8'))
    if (!poem?.id || !poem.category?.poet?.id || !poem.category?.cat?.id) {
      throw new Error(`Missing poem, poet or category ID in ${path}`)
    }
    const { poet: owner, cat } = poem.category
    const { id, name, nickname, rootCatId, pinOrder, validBirthDate, validDeathDate, birthYearInLHijri, deathYearInLHijri } = owner
    poet ??= { id, name, nickname, rootCatId, pinOrder, validBirthDate, validDeathDate, birthYearInLHijri, deathYearInLHijri }
    if (poet.id !== id || poems.has(poem.id)) throw new Error(`Unexpected poet or duplicate poem in ${path}`)
    poems.set(poem.id, textPoem(poem))

    const ancestors = (cat.ancestors || []).map(catInfo)
    for (const [index, entry] of ancestors.entries()) {
      if (!cats.has(entry.id)) cats.set(entry.id, { ...entry, ancestors: ancestors.slice(0, index) })
    }
    cats.set(cat.id, { ...catInfo(cat), ancestors })
  }
  if (!poet) return null
  if (!cats.has(poet.rootCatId)) {
    cats.set(poet.rootCatId, { id: poet.rootCatId, title: poet.nickname || poet.name, ancestors: [] })
  }
  return { poet, cats: [...cats.values()], poems: [...poems.values()] }
}

export async function packLibrary(root, output, expected = EXPECTED_POEMS) {
  const input = join(root, 'data')
  const folders = (await readdir(input, { withFileTypes: true })).filter((entry) => entry.isDirectory())
  const packs = []
  let count = 0
  await mkdir(output, { recursive: true })
  for (const folder of folders) {
    const pack = await readPoet(join(input, folder.name))
    if (!pack) continue
    const { id, name, nickname, pinOrder } = pack.poet
    const file = `${SNAPSHOT}-${id}.json.gz`
    const payload = Buffer.from(JSON.stringify(pack))
    const bytes = gzipSync(payload)
    await writeFile(join(output, file), bytes)
    packs.push({ id, name: nickname || name, pinOrder, file, bytes: bytes.byteLength, decodedBytes: payload.byteLength, poems: pack.poems.length })
    count += pack.poems.length
    if (packs.length % 25 === 0) console.log(`${packs.length} poet packs written`)
  }
  if (!packs.length || (expected && count !== expected)) {
    throw new Error(`Expected ${expected || 'at least one'} poems, found ${count}`)
  }
  packs.sort((a, b) => (a.pinOrder || Infinity) - (b.pinOrder || Infinity) || a.name.localeCompare(b.name, 'fa'))
  const manifest = { schema: 1, version: SNAPSHOT, source: SOURCE, packs }
  await writeFile(join(output, 'manifest.json'), JSON.stringify(manifest))
  console.log(`${count} poems in ${packs.length} packs, ${packs.reduce((sum, p) => sum + p.bytes, 0)} compressed bytes`)
  return manifest
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [root, output] = process.argv.slice(2)
  if (!root || !output) throw new Error('Usage: node scripts/make-offline-packs.mjs <extracted archive root> <output directory>')
  await packLibrary(root, output)
}
