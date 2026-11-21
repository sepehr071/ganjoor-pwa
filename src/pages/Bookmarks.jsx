import { useEffect, useState } from 'preact/hooks'
import { useTitle } from '../lib/hooks.js'
import { useStored, BOOKMARKS, savedPoemIds, savedPoemGet, savedPoemDelete } from '../lib/store.js'
import { poetName } from '../lib/poem.js'
import { PoemRow } from '../components/PoemRow.jsx'
import { Empty } from '../components/Status.jsx'

export default function Bookmarks() {
  useTitle('نشان\u200cشده\u200cها')
  const [list, setList] = useStored(BOOKMARKS, [])
  const [offline, setOffline] = useState([])

  const loadOffline = async () => {
    const ids = await savedPoemIds()
    const polys = await Promise.all(ids.map(savedPoemGet))
    setOffline(polys.filter(Boolean).map((p) => ({ id: p.id, title: p.fullTitle, poet: poetName(p) })))
  }
  useEffect(() => { loadOffline() }, [])

  return (
    <div class="stack-lg">
      <div class="page-head"><h1>نشان{'\u200c'}شده{'\u200c'}ها</h1></div>
      {list.length ? (
        <ul class="list poem-list">
          {list.map((b) => (
            <PoemRow key={b.id} {...b} onRemove={() => setList((l) => l.filter((x) => x.id !== b.id))} />
          ))}
        </ul>
      ) : (
        <Empty>
          هنوز شعری را نشان نکرده{'\u200c'}اید. در صفحهٔ هر شعر «نشان کردن» را بزنید تا اینجا جمع شود.
        </Empty>
      )}
      {offline.length > 0 && (
        <section>
          <h2 class="section-title">ذخیره{'\u200c'}شده برای آفلاین</h2>
          <ul class="list poem-list">
            {offline.map((b) => (
              <PoemRow key={b.id} {...b} onRemove={async () => { await savedPoemDelete(b.id); loadOffline() }} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
