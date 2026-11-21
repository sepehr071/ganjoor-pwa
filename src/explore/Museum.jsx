import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { url } from '../lib/base.js'
import { get, artifact, museumSite } from './api.js'
import { Page, Async, Empty, Pager, useAsync } from './ui.jsx'
import { fa, thumbUrl } from './util.js'

const PAGE_SIZE = 24
const stripHtml = (s) => String(s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim()

export function Museum() {
  const [draft, setDraft] = useState('')
  const [term, setTerm] = useState('')
  const [page, setPage] = useState(1)
  const res = useAsync(
    () => get(term ? '/artifacts/search' : '/artifacts', { term, PageNumber: page, PageSize: PAGE_SIZE }),
    [term, page],
  )
  return (
    <Page title={"موزهٔ نسخه\u200cهای خطی"} lead={"تصویر دیوان\u200cها و چاپ\u200cهای کهن شاعران که در موزهٔ گنجور نگهداری می\u200cشود."}>
      <form class="ex-filters" role="search" onSubmit={(e) => { e.preventDefault(); setPage(1); setTerm(draft.trim()) }}>
        <div class="ex-field">
          <label for="museum-q">جستجو در نسخه{'\u200c'}ها</label>
          <input id="museum-q" type="search" value={draft} placeholder="مثلاً حافظ" autocomplete="off" onInput={(e) => setDraft(e.currentTarget.value)} />
        </div>
        <button type="submit" class="ex-btn ex-btn-primary">جستجو</button>
        {term && (
          <button type="button" class="ex-btn" onClick={() => { setDraft(''); setTerm(''); setPage(1) }}>
            نمایش همه
          </button>
        )}
      </form>
      <Async q={res} rows={8} grid isEmpty={(d) => !d || !d.data || !d.data.length} empty={<Empty text={"نسخه\u200cای با این عبارت نیست. نام شاعر یا کتاب را کوتاه\u200cتر بنویسید."} />}>
        {({ data, paging }) => (
          <>
            {paging && <p class="ex-count" aria-live="polite">{fa(paging.total)} نسخه</p>}
            <ul class="ex-grid">
              {data.map((a) => {
                const c = a.coverImage || {}
                return (
                  <li key={a.id}>
                    <a class="ex-card" href={url('/museum/' + a.friendlyUrl)}>
                      <span class="ex-thumb" style={{ aspectRatio: c.thumbnailImageWidth && c.thumbnailImageHeight ? `${c.thumbnailImageWidth} / ${c.thumbnailImageHeight}` : '3 / 4' }}>
                        {c.externalNormalSizeImageUrl && <img src={thumbUrl(c.externalNormalSizeImageUrl)} alt="" loading="lazy" decoding="async" />}
                      </span>
                      <span class="ex-card-title">{a.name}</span>
                      {a.itemCount > 0 && <span class="ex-sub">{fa(a.itemCount)} تصویر</span>}
                    </a>
                  </li>
                )
              })}
            </ul>
            <Pager paging={paging} busy={res.loading} onPage={(p) => { setPage(p); window.scrollTo({ top: 0 }) }} />
          </>
        )}
      </Async>
    </Page>
  )
}

const ZOOMS = [1, 1.6, 2.4, 3.6]

function Viewer({ slug, items, index, onIndex, onClose }) {
  const [zoom, setZoom] = useState(0)
  const closeRef = useRef(null)
  const touch = useRef(null)
  const item = items[index]
  const img = item.images[0]
  const go = useCallback((d) => {
    const n = index + d
    if (n >= 0 && n < items.length) { setZoom(0); onIndex(n) }
  }, [index, items.length])

  useEffect(() => {
    const opener = document.activeElement
    closeRef.current && closeRef.current.focus()
    return () => opener && opener.focus && opener.focus()
  }, [])
  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Escape') onClose()
      // RTL book: the next page lies to the left
      else if (e.key === 'ArrowLeft') go(1)
      else if (e.key === 'ArrowRight') go(-1)
      else if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 1, ZOOMS.length - 1))
      else if (e.key === '-') setZoom((z) => Math.max(z - 1, 0))
    }
    document.addEventListener('keydown', key)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = '' }
  }, [go, onClose])
  useEffect(() => {
    // warm the neighbours
    for (const n of [index + 1, index - 1]) {
      const u = items[n] && items[n].images[0] && items[n].images[0].externalNormalSizeImageUrl
      if (u) new Image().src = u
    }
  }, [index])

  const onTouchEnd = (e) => {
    const t = touch.current
    touch.current = null
    if (!t || zoom > 0) return
    const dx = e.changedTouches[0].clientX - t.x
    const dy = e.changedTouches[0].clientY - t.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1)
  }

  return (
    <div class="ex-viewer" role="dialog" aria-modal="true" aria-label={`صفحهٔ ${fa(index + 1)} از ${fa(items.length)}`}>
      <div class="ex-viewer-bar">
        <button type="button" class="ex-btn" ref={closeRef} onClick={onClose}>بستن</button>
        <span class="ex-viewer-count" aria-live="polite">{fa(index + 1)} از {fa(items.length)}</span>
        <div class="ex-viewer-zoom" role="group" aria-label={"بزرگ\u200cنمایی"}>
          <button type="button" class="ex-btn" aria-label={"کوچک\u200cتر"} disabled={zoom === 0} onClick={() => setZoom(zoom - 1)}>−</button>
          <button type="button" class="ex-btn" aria-label={"بزرگ\u200cتر"} disabled={zoom === ZOOMS.length - 1} onClick={() => setZoom(zoom + 1)}>+</button>
        </div>
        <a class="ex-btn" href={museumSite(slug) + '/' + encodeURIComponent(item.friendlyUrl)} target="_blank" rel="noopener noreferrer">
          موزهٔ گنجور
        </a>
      </div>
      <div
        class="ex-viewer-stage"
        data-zoomed={zoom > 0 ? 'true' : undefined}
        tabIndex={0}
        onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
        onTouchEnd={onTouchEnd}
      >
        <img
          key={img.externalNormalSizeImageUrl}
          src={img.externalNormalSizeImageUrl}
          alt={item.name || `صفحهٔ ${fa(index + 1)}`}
          style={{ width: ZOOMS[zoom] * 100 + '%', maxHeight: zoom === 0 ? '100%' : 'none' }}
          onDblClick={() => setZoom(zoom === 0 ? 2 : 0)}
        />
      </div>
      <button type="button" class="ex-nav ex-nav-next" aria-label="صفحهٔ بعد" disabled={index >= items.length - 1} onClick={() => go(1)}>‹</button>
      <button type="button" class="ex-nav ex-nav-prev" aria-label="صفحهٔ قبل" disabled={index === 0} onClick={() => go(-1)}>›</button>
    </div>
  )
}

export function MuseumDetail({ slug }) {
  const q = useAsync(() => artifact(slug), [slug])
  const [open, setOpen] = useState(-1)
  const close = useCallback(() => setOpen(-1), [])
  return (
    <Page title={(q.data && q.data.name) || 'نسخه'} crumb={{ href: '/museum', label: 'همهٔ نسخه\u200cها' }} wide>
      <Async q={q} rows={8} grid isEmpty={(d) => !d || !d.items}>
        {(a) => {
          const items = (a.items || []).filter((i) => i.images && i.images[0] && i.images[0].externalNormalSizeImageUrl)
          const desc = stripHtml(a.description)
          return (
            <>
              {desc && <p class="ex-sub ex-desc">{desc}</p>}
              <p class="ex-note">
                <a href={museumSite(a.friendlyUrl)} target="_blank" rel="noopener noreferrer">دیدن این نسخه در موزهٔ گنجور</a>
              </p>
              {!items.length ? (
                <Empty title="تصویری نیست" text="برای این نسخه تصویری بارگذاری نشده است." />
              ) : (
                <>
                  <p class="ex-count">{fa(items.length)} تصویر. روی هر کدام بزنید تا باز شود.</p>
                  <ul class="ex-grid ex-grid-pages">
                    {items.map((it, i) => {
                      const im = it.images[0]
                      return (
                        <li key={it.id}>
                          <button type="button" class="ex-card" onClick={() => setOpen(i)} aria-label={it.name || `صفحهٔ ${fa(i + 1)}`}>
                            <span class="ex-thumb" style={{ aspectRatio: im.thumbnailImageWidth && im.thumbnailImageHeight ? `${im.thumbnailImageWidth} / ${im.thumbnailImageHeight}` : '3 / 4' }}>
                              <img src={thumbUrl(im.externalNormalSizeImageUrl)} alt="" loading="lazy" decoding="async" />
                            </span>
                            <span class="ex-sub">{fa(i + 1)}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                  {open >= 0 && <Viewer slug={a.friendlyUrl} items={items} index={open} onIndex={setOpen} onClose={close} />}
                </>
              )}
            </>
          )
        }}
      </Async>
    </Page>
  )
}
