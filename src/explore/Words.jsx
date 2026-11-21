import { useRef, useState } from 'preact/hooks'
import { useLocation } from 'preact-iso'
import { wordCounts, cat } from './api.js'
import { Page, Async, Empty, PoetSelect, Pager, useAsync } from './ui.jsx'
import { fa, barPercents } from './util.js'

const PAGE_SIZE = 30

export function Words({ catId }) {
  const loc = useLocation()
  const [draft, setDraft] = useState('')
  const [term, setTerm] = useState('')
  const [page, setPage] = useState(1)
  const top = useRef(0)
  const title = useAsync(() => cat(catId), [catId])
  const res = useAsync(() => wordCounts(catId, { term, PageNumber: page, PageSize: PAGE_SIZE }), [catId, term, page])
  const t = title.data && title.data.cat
  const poet = title.data && title.data.poet
  const name = t ? (poet && poet.fullUrl !== t.fullUrl ? `${poet.name}، ${t.title}` : (poet && poet.name) || t.title) : ''

  return (
    <Page title={"بسامد واژه\u200cها"} lead={name ? `پرتکرارترین واژه\u200cها در ${name}` : 'پرتکرارترین واژه\u200cها در یک شاعر یا کتاب'} wide>
      <div class="ex-filters">
        <PoetSelect id="words-poet" label="شاعر" by="rootCatId" value={catId} onChange={(v) => { if (!v) return; setPage(1); setTerm(''); setDraft(''); top.current = 0; loc.route('/words/' + v) }} />
        <form
          class="ex-filters-inline"
          role="search"
          onSubmit={(e) => { e.preventDefault(); setPage(1); top.current = 0; setTerm(draft.trim()) }}
        >
          <div class="ex-field">
            <label for="words-q">جستجوی واژه</label>
            <input id="words-q" value={draft} placeholder="مثلاً عشق" autocomplete="off" onInput={(e) => setDraft(e.currentTarget.value)} />
          </div>
          <button type="submit" class="ex-btn ex-btn-primary">جستجو</button>
          {term && (
            <button type="button" class="ex-btn" onClick={() => { setDraft(''); setTerm(''); setPage(1); top.current = 0 }}>
              پاک{'\u200c'}کردن
            </button>
          )}
        </form>
      </div>
      <Async q={res} rows={10} isEmpty={(d) => !d || !d.data || !d.data.length} empty={<Empty text={term ? 'این واژه در متن نیامده یا املای دیگری دارد.' : 'برای این شاعر یا کتاب آماری نیست.'} />}>
        {({ data, paging }) => {
          if (page === 1 || !top.current) top.current = data[0].count
          const pct = barPercents(data.map((d) => d.count), top.current)
          return (
            <>
              {paging && <p class="ex-count" aria-live="polite">{fa(paging.total)} واژهٔ متفاوت</p>}
              <ol class="ex-bars" start={(page - 1) * PAGE_SIZE + 1}>
                {data.map((d, i) => (
                  <li key={d.id}>
                    <span class="ex-bar-word">{d.word}</span>
                    <span class="ex-bar-track" aria-hidden="true">
                      <span class="ex-bar-fill" style={{ width: pct[i] + '%' }} />
                    </span>
                    <span class="ex-num">{fa(d.count)}</span>
                  </li>
                ))}
              </ol>
              <Pager paging={paging} busy={res.loading} onPage={setPage} />
            </>
          )
        }}
      </Async>
    </Page>
  )
}
