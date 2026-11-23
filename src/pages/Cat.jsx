import { useState } from 'preact/hooks'
import { url } from '../lib/base.js'
import { getCategory } from '../api.js'
import { useAsync, useTitle } from '../lib/hooks.js'
import { normalize, toFaDigits } from '../lib/poem.js'
import { Loading, ErrorState, Empty } from '../components/Status.jsx'
import { PoemRow } from '../components/PoemRow.jsx'

const STEP = 50

// The cat endpoint returns every poem of a category at once and has no server paging,
// so the list is windowed here (and filterable) instead of using paging-headers.
export default function Cat({ id }) {
  const [shown, setShown] = useState(STEP)
  const [q, setQ] = useState('')
  const { data, error, loading, retry } = useAsync(
    (signal) => getCategory(id, { signal }),
    [id],
  )
  const cat = data?.cat
  useTitle(cat && `${data.poet?.nickname || ''} ${cat.title}`.trim())
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} onRetry={retry} />

  const poet = data.poet
  const trail = (cat.ancestors || []).slice(1)
  const children = cat.children || []
  const nq = normalize(q)
  const all = cat.poems || []
  const poems = nq ? all.filter((p) => normalize(p.title + ' ' + (p.excerpt || '')).includes(nq)) : all

  return (
    <div class="stack-lg">
      <header>
        <nav class="crumbs" aria-label="مسیر">
          <a href={url('/poet/' + poet.id)}>{poet.nickname || poet.name}</a>
          {trail.map((a) => (
            <a key={a.id} href={url('/cat/' + a.id)}>{a.title}</a>
          ))}
        </nav>
        <h1>{cat.title}</h1>
        {cat.description && <p class="muted" style="margin-top:.5rem">{cat.description.slice(0, 280)}</p>}
      </header>

      {children.length > 0 && (
        <section>
          <h2 class="section-title">بخش{'\u200c'}ها</h2>
          <ul class="list">
            {children.map((c) => (
              <li key={c.id}>
                <a class="list-link" href={url('/cat/' + c.id)}><div class="list-main list-title">{c.title}</div></a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {all.length > 0 && (
        <section>
          <div class="section-title">
            <h2>شعرها</h2>
            <span class="muted small">{toFaDigits(poems.length)} شعر</span>
          </div>
          {all.length > 15 && (
            <div style="margin-bottom:.75rem">
              <label class="sr-only" for="cat-q">جستجو در این بخش</label>
              <input id="cat-q" class="field" type="search" placeholder="جستجو در این بخش…" value={q} onInput={(e) => { setQ(e.currentTarget.value); setShown(STEP) }} />
            </div>
          )}
          {poems.length ? (
            <ul class="list poem-list">
              {poems.slice(0, shown).map((p) => (
                <PoemRow key={p.id} id={p.id} title={p.title} excerpt={p.excerpt} />
              ))}
            </ul>
          ) : (
            <Empty>شعری با این عبارت پیدا نشد.</Empty>
          )}
          {poems.length > shown && (
            <div class="row" style="justify-content:center;margin-top:1rem">
              <button type="button" class="btn" onClick={() => setShown(shown + STEP)}>نمایش {toFaDigits(Math.min(STEP, poems.length - shown))} شعر بعدی</button>
            </div>
          )}
        </section>
      )}
      {!children.length && !all.length && <Empty>این بخش شعری ندارد.</Empty>}
    </div>
  )
}
