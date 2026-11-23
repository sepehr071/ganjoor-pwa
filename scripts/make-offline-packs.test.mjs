import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { expect, it } from 'vitest'
import { packLibrary } from './make-offline-packs.mjs'

it('packs only the reader text and hierarchy, preserving Ganjoor IDs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'beyt-offline-'))
  try {
    const poems = join(root, 'data', 'hafez', 'ghazal')
    const output = join(root, 'output')
    await mkdir(poems, { recursive: true })
    await writeFile(join(poems, '1.json'), JSON.stringify({ poem: {
      id: 2130,
      title: 'غزل شمارهٔ ۱',
      fullTitle: 'حافظ » غزلیات » غزل شمارهٔ ۱',
      fullUrl: '/hafez/ghazal/sh1',
      plainText: 'الا یا ایها الساقی',
      verses: [{ vOrder: 1, coupletIndex: 0, versePosition: 0, text: 'الا یا ایها الساقی', coupletSummary: 'Editorial note' }],
      category: {
        poet: { id: 2, rootCatId: 9, nickname: 'حافظ' },
        cat: { id: 24, title: 'غزلیات', ancestors: [{ id: 9, title: 'حافظ' }] },
      },
      sections: [{ sectionType: 0, number: 1, rhymeLetters: 'لها', ganjoorMetre: { id: 2, rhythm: 'مفاعیلن' } }],
      comments: [{ userId: 'example' }],
      recitations: [{ id: 5 }],
    } }))

    const manifest = await packLibrary(root, output, 1)
    const [entry] = manifest.packs
    const compressed = await readFile(join(output, entry.file))
    const { poet, cats, poems: [poem] } = JSON.parse(gunzipSync(compressed))
    expect(entry).toMatchObject({ id: 2, bytes: compressed.length, poems: 1 })
    expect(poet.id).toBe(2)
    expect(cats).toEqual([{ id: 9, title: 'حافظ', ancestors: [] }, { id: 24, title: 'غزلیات', ancestors: [{ id: 9, title: 'حافظ' }] }])
    expect(poem).toMatchObject({ id: 2130, catId: 24, poetId: 2, sections: [{ ganjoorMetre: { id: 2, rhythm: 'مفاعیلن' } }] })
    expect(poem.verses[0]).toEqual({ vOrder: 1, coupletIndex: 0, versePosition: 0, text: 'الا یا ایها الساقی' })
    expect(poem).not.toHaveProperty('recitations')
    expect(poem).not.toHaveProperty('comments')
    expect(poem).not.toHaveProperty('plainText')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
