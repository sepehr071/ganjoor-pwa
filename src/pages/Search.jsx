import { useEffect, useRef, useState } from 'preact/hooks'
import { useLocation } from 'preact-iso'
import { url } from '../lib/base.js'
import { searchText, searchMeaning } from '../api.js'
import { useTitle } from '../lib/hooks.js'
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

export default function Search() {
  const { query, route } = useLocation()
  const q = (query.q || '').trim()
  const mode = query.mode === 'meaning' ? 'meaning' : 'text'
  const [input, setInput] = useState(q)
  const inputRef = useRef(null)
  const [st, setSt] = useState({ items: [], loading: false, error: null, page: 1, hasNext: false, notice: '', done: false })
  useTitle(q ? `جستجوی ${q}` : 'جستجو')

  useEffect(() => setInput(q), [q])
  // Arriving without a query (search tab, empty home field): ready to type.
  useEffect(() => {
    if (!q) inputRef.current?.focus()
  }, [])

  const run = async (page, signal, forceText) => {
    setSt((s) => ({ ...s, loading: true, error: null, notice: page === 1 ? '' : s.notice, items: page === 1 ? [] : s.items }))
    try {
      if (mode === 'meaning' && !forceText) {
        try {
          const j = await searchMeaning(q, 15, { signal })
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
          return setSt({ items, loading: false, error: null, page: 1, hasNext: false, notice: '', done: true })
        } catch {
          if (signal?.aborted) return
          return run(1, signal, true).then(() => setSt((s) => ({ ...s, notice: 'جستجو بر پایهٔ معنا الان در دسترس نیست. نتیجه\u200cها از جستجوی متنی آمده\u200cاند.' })))
        }
      }
      const { data, paging } = await searchText(q, page, 20, { signal })
      const items = data.map((p) => ({ ...fromText(p), lines: textSnippet(p.plainText, q) }))
      setSt((s) => ({
        items: page === 1 ? items : [...s.items, ...items],
        loading: false, error: null, page, hasNext: !!paging?.hasNextPage, notice: forceText ? s.notice : '', done: true,
      }))
    } catch (e) {
      if (!signal?.aborted) setSt((s) => ({ ...s, loading: false, error: e }))
    }
  }

  useEffect(() => {
    if (!q) return setSt({ items: [], loading: false, error: null, page: 1, hasNext: false, notice: '', done: false })
    const ctrl = new AbortController()
    run(1, ctrl.signal)
    return () => ctrl.abort()
  }, [q, mode])

  const go = (nq, nm) => route(`/search?q=${encodeURIComponent(nq)}${nm === 'meaning' ? '&mode=meaning' : ''}`, true)

  return (
    <div class="stack-lg">
      <div class="page-head"><h1 class="display">جستجو</h1></div>
      <form class="search-pill" role="search" onSubmit={(e) => { e.preventDefault(); if (input.trim()) go(input.trim(), mode) }}>
        <Icon name="search" size={20} />
        <label class="sr-only" for="q">عبارت جستجو</label>
        <input id="q" type="search" value={input} onInput={(e) => setInput(e.currentTarget.value)} ref={inputRef}
          placeholder={mode === 'meaning' ? 'مثلاً: دلتنگی برای وطن' : 'واژه یا مصرع…'} enterkeyhint="search" />
      </form>
      <div class="segmented" role="group" aria-label="نوع جستجو">
        <button type="button" aria-pressed={mode === 'text'} onClick={() => go(input.trim() || q, 'text')}>در متن</button>
        <button type="button" aria-pressed={mode === 'meaning'} onClick={() => go(input.trim() || q, 'meaning')}>بر پایهٔ معنا</button>
      </div>
      {mode === 'meaning' && !q && <p class="muted">حس یا موضوع را بنویسید تا شعرهای نزدیک به آن پیدا شود. بر پایهٔ گنج{'\u200c'}گاه.</p>}
      {st.notice && <p class="offline-banner" role="status" style="border-radius:var(--radius)">{st.notice}</p>}
      {st.error && <ErrorState error={st.error} onRetry={() => run(st.page, undefined)} />}
      {st.loading && !st.items.length && <Loading label="در حال جستجو" />}
      {st.done && !st.loading && !st.error && !st.items.length && <Empty>برای «{q}» چیزی پیدا نشد. واژهٔ دیگری امتحان کنید{mode === 'text' ? ' یا جستجو بر پایهٔ معنا را بزنید' : ''}.</Empty>}
      {st.items.length > 0 && (
        <>
          <p class="muted small" aria-live="polite">{toFaDigits(st.items.length)} نتیجه{st.hasNext ? ' تا اینجا' : ''}</p>
          <ul class="list poem-list">
            {st.items.map((r) => <Result key={r.id} r={r} term={mode === 'text' ? q : ''} />)}
          </ul>
        </>
      )}
      {st.hasNext && (
        <div class="row" style="justify-content:center">
          <button type="button" class="btn" disabled={st.loading} onClick={() => run(st.page + 1)}>نتیجه{'\u200c'}های بیشتر</button>
        </div>
      )}
    </div>
  )
}
