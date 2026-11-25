import { useEffect, useState } from 'preact/hooks'
import { toast, useTitle } from '../lib/hooks.js'
import { url } from '../lib/base.js'
import { useStored, BOOKMARKS, savedPoems, savedPoemDelete } from '../lib/store.js'
import { normalize, poetName, toFaDigits } from '../lib/poem.js'
import { Icon } from '../components/Icon.jsx'
import { PoemRow } from '../components/PoemRow.jsx'
import { Empty } from '../components/Status.jsx'

export default function Bookmarks() {
  useTitle('نشان\u200cشده\u200cها')
  const [list, setList] = useStored(BOOKMARKS, [])
  const [offline, setOffline] = useState([])
  const [collection, setCollection] = useState('bookmarks')
  const [query, setQuery] = useState('')

  const loadOffline = async () => {
    const poems = await savedPoems()
    setOffline(poems.map((p) => ({
      id: p.id, title: p.fullTitle || p.title, poet: poetName(p),
      excerpt: p.verses?.[0]?.text || p.plainText?.split('\n', 1)[0],
    })))
  }
  useEffect(() => { loadOffline() }, [])

  const downloaded = collection === 'offline'
  const entries = downloaded ? offline : list
  const term = normalize(query)
  const visible = term ? entries.filter((p) => normalize([p.title, p.poet, p.excerpt].filter(Boolean).join(' ')).includes(term)) : entries
  const switchCollection = (next) => {
    if (next === collection) return
    setCollection(next)
    setQuery('')
  }

  async function removeDownload(id) {
    try {
      await savedPoemDelete(id)
      await loadOffline()
    } catch {
      toast('شعر از دستگاه پاک نشد.')
    }
  }

  return (
    <div class="saved-library stack-lg">
      <div class="page-head"><h1 class="display">نشان{'\u200c'}شده{'\u200c'}ها</h1></div>
      <div class="segmented" role="group" aria-label="فهرست شعرها">
        <button type="button" aria-pressed={!downloaded} onClick={() => switchCollection('bookmarks')}>
          نشان{'\u200c'}ها <span class="saved-count">{toFaDigits(list.length)}</span>
        </button>
        <button type="button" aria-pressed={downloaded} onClick={() => switchCollection('offline')}>
          شعرهای آفلاین <span class="saved-count">{toFaDigits(offline.length)}</span>
        </button>
      </div>
      {entries.length > 0 && (
        <label class="search-pill">
          <Icon name="search" size={20} />
          <span class="sr-only">جستجو در این فهرست</span>
          <input type="search" placeholder="نام شاعر، عنوان یا مصرع…" value={query} onInput={(e) => setQuery(e.currentTarget.value)} />
        </label>
      )}
      {visible.length > 0 ? (
        <ul class="list poem-list saved-list">
          {visible.map((p) => {
            const parts = (p.title || '').split('»').map((part) => part.trim()).filter(Boolean)
            const title = parts.pop() || 'خواندن شعر'
            return (
              <PoemRow key={p.id} {...p} title={title} poet={parts.join(' · ') || p.poet} collection
                removeLabel={downloaded ? `پاک کردن ${title} و خوانش\u200cهای آن از دستگاه` : `برداشتن نشان ${title}`}
                onRemove={downloaded ? () => removeDownload(p.id) : () => setList((l) => l.filter((x) => x.id !== p.id))} />
            )
          })}
        </ul>
      ) : term ? (
        <Empty>شعری با این عبارت در فهرست پیدا نشد.</Empty>
      ) : (
        <Empty>
          {downloaded ? <Icon name="offline" size={26} />
            : <img class="library-empty-art" src={url('/art/saved-library.webp')} alt="" width="800" height="450" loading="lazy" />}
          <p>{downloaded ? 'هنوز شعری برای خواندن آفلاین ذخیره نکرده\u200cاید.' : 'هنوز شعری را نشان نکرده\u200cاید.'}</p>
          {!downloaded && <a class="btn" href={url('/poets')}>مرور شاعران</a>}
        </Empty>
      )}
      {downloaded && (
        <div class="row">
          <a class="btn" href={url('/offline')}>کتابخانهٔ آفلاین</a>
          {offline.length > 0 && <p class="muted small">با پاک کردن هر شعر، خوانش{'\u200c'}های دریافت{'\u200c'}شدهٔ آن هم پاک می{'\u200c'}شوند.</p>}
        </div>
      )}
    </div>
  )
}
