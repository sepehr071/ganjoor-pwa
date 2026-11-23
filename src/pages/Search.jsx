import { useEffect, useRef, useState } from 'preact/hooks'
import { useLocation } from 'preact-iso'
import { url } from '../lib/base.js'
import { getPoet, searchText, searchMeaning } from '../api.js'
import { useAsync, useTitle } from '../lib/hooks.js'
import { normalize, parseMeaning, toFaDigits } from '../lib/poem.js'
import { Loading, ErrorState, Empty } from '../components/Status.jsx'
import { Icon } from '../components/Icon.jsx'

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Split a line around the search term so matches can be wrapped in <mark>. */
function Marked({ text, term }) {
  if (!term) return text
  const parts = text.split(new RegExp(`(${esc(term)})`, 'gi'))
  return parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p))
}

// Pick the couplet that contains the term from a poem's plain text.
function textSnippet(plain = '', term) {
  const lines = plain.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const nt = normalize(term)
  let i = lines.findIndex((l) => normalize(l).includes(nt))
  if (i < 0) i = 0
  const start = i % 2 ? i - 1 : i
  return lines.slice(start, start + 2)
}

const poetOf = (fullTitle = '') => fullTitle.split('»')[0].trim()

function Result({ r, term }) {
  return (
    <li>
      <a class="list-link" href={url('/poem/' + r.id)} style="align-items:flex-start">
        <div class="list-main">
          <div class="list-title">{r.poet}{r.title ? `، ${r.title}` : ''}</div>
          {r.lines.map((l, i) => (
            <div key={i} class="list-sub wrap" style="font-size:1.05rem;color:var(--text)">
              <Marked text={l} term={term} />
            </div>
          ))}
          {r.note && <div class="list-sub wrap" style="margin-top:.25rem">{r.note}</div>}
        </div>
      </a>
    </li>
  )
}

const fromText = (p) => ({
  id: p.id,
  poet: poetOf(p.fullTitle),
  title: p.title,
})

const initialResults = { items: [], loading: false, error: null, page: 1, retryPage: 1, hasNext: false, notice: '', done: false }

export default function Search() {
  const { query, route } = useLocation()
  const q = (query.q || '').trim()
  const poetId = /^[1-9]\d*$/.test(query.poet || '') && Number.isSafeInteger(Number(query.poet)) ? Number(query.poet) : null
  const mode = !poetId && query.mode === 'meaning' ? 'meaning' : 'text'
  const [input, setInput] = useState(q)
  const inputRef = useRef(null)
  const requestRef = useRef(null)
  const [st, setSt] = useState(initialResults)
  const { data: poetData, loading: poetLoading } = useAsync(
    (signal) => poetId ? getPoet(poetId, { signal }) : Promise.resolve(null),
    [poetId],
  )
  const poet = !poetLoading && poetData?.poet
  const heading = poetId ? `جستجو در آثار${poet ? ' ' + (poet.nickname || poet.name) : ' شاعر'}` : 'جستجو'
  useTitle(q ? `${heading} · ${q}` : heading)

  useEffect(() => setInput(q), [q])
  // Arriving without a query (search tab, empty home field): ready to type.
  useEffect(() => {
    if (!q) inputRef.current?.focus()
  }, [])

  const run = async (page) => {
    requestRef.current?.abort()
    const ctrl = new AbortController()
    requestRef.current = ctrl
    const { signal } = ctrl
    setSt((s) => ({ ...(page === 1 ? initialResults : s), loading: true, error: null }))
    let notice = page === 1 ? '' : st.notice
    try {
      if (mode === 'meaning' && page === 1) {
        try {
          const j = await searchMeaning(q, 15, { signal })
          if (signal.aborted) return
          const items = (j.results || []).map((r) => {
            const note = parseMeaning(r.poemSummary)
            const vs = (r.verses || []).slice(0, 2).map((v) => v.text)
            return {
              id: r.poemId,
              poet: poetOf(r.fullTitle),
              title: r.title,
              lines: vs,
              note: note && (note.ai ? 'معنی (هوش مصنوعی): ' : 'معنی: ') + note.text.slice(0, 140) + (note.text.length > 140 ? '…' : ''),
            }
          })
          return setSt({ ...initialResults, items, done: true })
        } catch {
          if (signal.aborted) return
          notice = 'جستجو بر پایهٔ معنا در دسترس نیست. نتیجه\u200cهای جستجوی متنی را می\u200cبینید.'
        }
      }
      const { data, paging, offline } = await searchText(q, page, 20, { signal, poetId })
      if (signal.aborted) return
      if (page > 1 && Boolean(offline) !== st.offline) return run(1)
      const items = data.map((p) => ({ ...fromText(p), lines: textSnippet(p.plainText, q) }))
      setSt((s) => ({
        items: page === 1 ? items : [...s.items, ...items],
        loading: false, error: null, page, retryPage: page, hasNext: !!paging?.hasNextPage,
        notice: offline ? 'جستجو در شعرهای دانلودشده' : notice, offline: Boolean(offline), done: true,
      }))
    } catch (e) {
      if (!signal.aborted) setSt((s) => ({ ...s, loading: false, error: e, retryPage: page }))
    }
  }

  useEffect(() => {
    if (q) run(1)
    else setSt(initialResults)
    return () => requestRef.current?.abort()
  }, [q, mode, poetId])

  const searchPath = (term, kind, scope = poetId) => {
    const params = new URLSearchParams()
    if (scope) params.set('poet', scope)
    if (term) params.set('q', term)
    if (!scope && kind === 'meaning') params.set('mode', kind)
    const search = params.toString()
    return '/search' + (search ? '?' + search : '')
  }
  const go = (nq, nm) => route(searchPath(nq, nm), true)

  return (
    <div class="stack-lg">
      <div class="page-head">
        <h1 class="display">{heading}</h1>
        {poetId && <p><a href={url(searchPath(q, 'text', null))}>جستجو در آثار همهٔ شاعران</a></p>}
      </div>
      <form class="search-pill" role="search" onSubmit={(e) => { e.preventDefault(); if (input.trim()) go(input.trim(), mode) }}>
        <Icon name="search" size={20} />
        <label class="sr-only" for="q">عبارت جستجو</label>
        <input id="q" type="search" value={input} onInput={(e) => setInput(e.currentTarget.value)} ref={inputRef}
          placeholder={mode === 'meaning' ? 'مثلاً: دلتنگی برای وطن' : 'واژه یا مصرع…'} enterkeyhint="search" />
      </form>
      {!poetId && <div class="segmented" role="group" aria-label="نوع جستجو">
        <button type="button" aria-pressed={mode === 'text'} onClick={() => go(input.trim() || q, 'text')}>در متن</button>
        <button type="button" aria-pressed={mode === 'meaning'} onClick={() => go(input.trim() || q, 'meaning')}>بر پایهٔ معنا</button>
      </div>}
      {mode === 'meaning' && !q && <p class="muted">حس یا موضوع را بنویسید تا شعرهای نزدیک به آن پیدا شود. بر پایهٔ گنج{'\u200c'}گاه.</p>}
      {st.notice && <p class="offline-banner" role="status" style="border-radius:var(--radius)">{st.notice}</p>}
      {st.error && <ErrorState error={st.error} onRetry={() => run(st.retryPage)} />}
      {st.loading && !st.items.length && <Loading label="در حال جستجو" />}
      {st.done && !st.loading && !st.error && !st.items.length && <Empty>برای «{q}» چیزی پیدا نشد. واژهٔ دیگری امتحان کنید{!poetId && mode === 'text' ? ' یا جستجو بر پایهٔ معنا را بزنید' : ''}.</Empty>}
      {st.items.length > 0 && (
        <>
          <p class="muted small" aria-live="polite">{toFaDigits(st.items.length)} نتیجه{st.hasNext ? ' تا اینجا' : ''}</p>
          <ul class="list poem-list">
            {st.items.map((r) => <Result key={r.id} r={r} term={mode === 'text' ? q : ''} />)}
          </ul>
        </>
      )}
      {st.hasNext && !st.error && (
        <div class="row" style="justify-content:center">
          <button type="button" class="btn" disabled={st.loading} onClick={() => run(st.page + 1)}>نتیجه{'\u200c'}های بیشتر</button>
        </div>
      )}
    </div>
  )
}
