import { useEffect, useState } from 'preact/hooks'
import './explore.css'
import { url } from '../lib/base.js'
import { poets } from './api.js'
import { fa, firstCouplet } from './util.js'

// Runs `fn` on mount and whenever deps change. Keeps the previous data while reloading.
export function useAsync(fn, deps) {
  const [state, setState] = useState({ loading: true, data: null, error: null })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let live = true
    setState((s) => ({ ...s, loading: true, error: null }))
    Promise.resolve()
      .then(fn)
      .then(
        (data) => live && setState({ loading: false, data, error: null }),
        (error) => live && setState({ loading: false, data: null, error }),
      )
    return () => { live = false }
  }, [...deps, tick])
  return { ...state, reload: () => setTick((t) => t + 1) }
}

export function Page({ title, lead, crumb, children, wide }) {
  return (
    <section class={'ex' + (wide ? ' ex-wide' : '')}>
      {crumb && (
        <nav class="ex-crumb" aria-label="مسیر">
          <a href={url(crumb.href)}>{crumb.label}</a>
        </nav>
      )}
      <header class="ex-head">
        <h1>{title}</h1>
        {lead && <p class="ex-lead">{lead}</p>}
      </header>
      {children}
    </section>
  )
}

export function Skeleton({ rows = 6, grid }) {
  return (
    <div class={grid ? 'ex-skel-grid' : 'ex-skel-list'} role="status" aria-live="polite">
      <span class="ex-sr">در حال بارگذاری…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div class="ex-skel" key={i} aria-hidden="true" style={{ '--w': 60 + ((i * 17) % 35) + '%' }} />
      ))}
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  return (
    <div class="ex-state ex-error" role="alert">
      <p class="ex-state-title">بارگذاری انجام نشد</p>
      <p class="ex-state-text">
        اتصال به گنجور برقرار نشد یا پاسخ درستی نیامد{error && error.message ? ` (${error.message})` : ''}. اینترنت را
        بررسی کنید و دوباره تلاش کنید.
      </p>
      {onRetry && (
        <button type="button" class="ex-btn" onClick={onRetry}>
          تلاش دوباره
        </button>
      )}
    </div>
  )
}

export function Empty({ title = 'چیزی پیدا نشد', text, action }) {
  return (
    <div class="ex-state">
      <p class="ex-state-title">{title}</p>
      {text && <p class="ex-state-text">{text}</p>}
      {action}
    </div>
  )
}

// Wraps the async states so each page only renders the success case.
export function Async({ q, rows, grid, isEmpty, empty, children }) {
  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />
  if (q.loading && !q.data) return <Skeleton rows={rows} grid={grid} />
  if (isEmpty && isEmpty(q.data)) return empty || <Empty />
  return children(q.data)
}

export function SearchField({ label, value, onInput, placeholder, id }) {
  return (
    <div class="ex-field">
      <label for={id}>{label}</label>
      <input
        id={id}
        type="search"
        inputMode="search"
        value={value}
        placeholder={placeholder}
        autocomplete="off"
        onInput={(e) => onInput(e.currentTarget.value)}
      />
    </div>
  )
}

// Poet dropdown; value is the poet's `id` or `rootCatId` depending on `by`. Falls back to nothing if poets fail to load.
export function PoetSelect({ id, label, value, onChange, by = 'id', allLabel }) {
  const q = useAsync(() => poets(), [])
  const list = (q.data || [])
    .filter((p) => p.published !== false)
    .sort((a, b) => a.name.localeCompare(b.name, 'fa'))
  return (
    <div class="ex-field">
      <label for={id}>{label}</label>
      <select id={id} value={String(value ?? '')} onChange={(e) => onChange(e.currentTarget.value)} disabled={!list.length}>
        {allLabel && <option value="">{allLabel}</option>}
        {list.map((p) => (
          <option key={p.id} value={String(p[by])}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  )
}

export function Pager({ paging, onPage, busy }) {
  if (!paging || paging.pages <= 1) return null
  return (
    <nav class="ex-pager" aria-label={"صفحه\u200cبندی"}>
      <button type="button" class="ex-btn" disabled={!paging.hasPrev || busy} onClick={() => onPage(paging.page - 1)}>
        قبلی
      </button>
      <span aria-live="polite">
        صفحهٔ {fa(paging.page)} از {fa(paging.pages)}
      </span>
      <button type="button" class="ex-btn" disabled={!paging.hasNext || busy} onClick={() => onPage(paging.page + 1)}>
        بعدی
      </button>
    </nav>
  )
}

// A poem hit: title (link to the reader) plus its opening couplet.
export function PoemRow({ id, title, lines, meta }) {
  const l = Array.isArray(lines) ? lines : firstCouplet(lines)
  return (
    <li class="ex-poem">
      <a href={url('/poem/' + id)} class="ex-poem-link">
        <span class="ex-poem-title">{title}</span>
        {l.length > 0 && (
          <span class="ex-poem-lines" dir="rtl">
            {l.map((x, i) => (
              <span key={i}>{x}</span>
            ))}
          </span>
        )}
        {meta && <span class="ex-poem-meta">{meta}</span>}
      </a>
    </li>
  )
}
