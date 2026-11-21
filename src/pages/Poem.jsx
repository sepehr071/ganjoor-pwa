import { useEffect, useMemo, useState } from 'preact/hooks'
import { getPoem } from '../api.js'
import { useAsync, useTitle, share, copyText, toast } from '../lib/hooks.js'
import {
  useStored, BOOKMARKS, COACH, toggleBookmark, pushHistory, updateHistory,
  savedPoemGet, savedPoemPut, savedPoemDelete,
} from '../lib/store.js'
import {
  groupCouplets, coupletsFromPlain, parseMeaning, meterOf, poemText, poemRef, poetName, ganjoorUrl,
} from '../lib/poem.js'
import { usePlayer, play } from '../lib/player.js'
import { url } from '../lib/base.js'
import { Icon } from '../components/Icon.jsx'
import { Couplets } from '../components/Couplets.jsx'
import { Sheet } from '../components/Sheet.jsx'
import { ReciterList } from '../components/Player.jsx'
import { BackButton } from '../components/BackButton.jsx'
import { Sarlowh } from '../components/Ornament.jsx'
import { Loading, ErrorState } from '../components/Status.jsx'

// Falls back to the copy saved for offline when the network call fails.
async function loadPoem(id, signal) {
  try {
    return await getPoem(id, { signal })
  } catch (e) {
    const saved = await savedPoemGet(id)
    if (saved) return { ...saved, _fromSaved: true }
    throw e
  }
}

export default function Poem({ id }) {
  const { data: poem, error, loading, retry } = useAsync((signal) => loadPoem(id, signal), [id])
  const [bookmarks] = useStored(BOOKMARKS, [])
  const [coach, setCoach] = useStored(COACH, false)
  const [saved, setSaved] = useState(false)
  const [more, setMore] = useState(false)
  const player = usePlayer()

  const couplets = useMemo(
    () => (poem ? (poem.verses?.length ? groupCouplets(poem.verses) : coupletsFromPlain(poem.plainText).map((c) => ({ ...c, vOrders: [], single: !c.b }))) : []),
    [poem],
  )
  const recs = useMemo(() => (poem?.recitations || []).filter((r) => r.mp3Url), [poem])
  const entry = useMemo(
    () => poem && { id: poem.id, title: poem.fullTitle, poet: poetName(poem), next: poem.next, couplets, recs },
    [poem, couplets, recs],
  )

  useTitle(poem && `${poem.title} ${poetName(poem)}`)
  useEffect(() => {
    if (!poem) return
    pushHistory(poemRef(poem, couplets))
    savedPoemGet(poem.id).then((s) => setSaved(!!s))
    // Reading position for "continue reading": the furthest couplet that has been on screen.
    let max = 0
    const io = new IntersectionObserver((es) => {
      const seen = Math.max(max, ...es.filter((e) => e.isIntersecting).map((e) => Number(e.target.id.slice(1))))
      if (seen > max) updateHistory(poem.id, { pos: (max = seen), total: couplets.length })
    })
    document.querySelectorAll('.poem-body .couplet').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [poem])

  if (loading) return <Loading label="در حال بارگیری شعر" />
  if (error) return <ErrorState error={error} onRetry={retry} />

  const cat = poem.category?.cat
  const poet = poem.category?.poet
  const book = cat?.ancestors?.length ? cat : null // a category without ancestors is the poet itself
  const bookmarked = bookmarks.some((b) => b.id === poem.id)
  const meter = meterOf(poem)
  const summary = parseMeaning(poem.poemSummary)
  const mine = player.poem?.id === poem.id
  const synced = (i) => recs[i]?.inSyncWithText && couplets[0]?.vOrders?.length
  const link = location.origin + url('/poem/' + poem.id)
  const credit = `${poem.fullTitle}، گنجور`
  const poetLabel = poet?.nickname || poet?.name

  const onSave = async () => {
    try {
      if (saved) await savedPoemDelete(poem.id)
      else await savedPoemPut(poem)
      setSaved(!saved)
      toast(saved ? 'از حافظهٔ آفلاین برداشته شد' : 'برای خواندن آفلاین ذخیره شد')
    } catch {
      toast('ذخیره در این مرورگر ممکن نیست')
    }
  }

  return (
    <article class="poem">
      <div class="appbar">
        <BackButton fallback={cat ? '/cat/' + cat.id : '/'} />
        <nav class="crumbs" aria-label="مسیر">
          {poet && <a href={url('/poet/' + poet.id)}>{poetLabel}</a>}
          {book && <a href={url('/cat/' + book.id)}>{book.title}</a>}
        </nav>
        <button type="button" class="icon-btn bm" aria-pressed={bookmarked} aria-label="نشان کردن" onClick={() => toggleBookmark(poemRef(poem, couplets))}>
          <Icon name="bookmark" size={21} fill={bookmarked} />
        </button>
        <button type="button" class="icon-btn" aria-haspopup="dialog" aria-expanded={more} aria-label="کارهای بیشتر" onClick={() => setMore(true)}>
          <Icon name="dots" size={22} />
        </button>
      </div>

      <div class="folio">
        <header class="folio-head">
          <Sarlowh />
          <h1 class="display">{poem.title}</h1>
          {(meter || poem._fromSaved) && (
            <div class="folio-meta">
              {meter?.id && <a class="chip" href={url('/meters/' + meter.id)}><span class="sr-only">وزن: </span>{meter.rhythm}</a>}
              {meter?.rhyme && <span class="chip static">قافیه: {meter.rhyme}</span>}
              {poem._fromSaved && <span class="chip static">نسخهٔ ذخیره{'\u200c'}شده برای آفلاین</span>}
            </div>
          )}
          {recs.length > 0 && !mine && (
            <button type="button" class="btn primary listen" onClick={() => play(entry, 0)}>
              <Icon name="play" size={18} fill /> گوش دادن
            </button>
          )}
        </header>
        {!coach && (
          <p class="coach" role="note">
            روی هر بیت بزنید تا معنی{'\u200c'}اش را ببینید.
            <button type="button" class="btn link" onClick={() => setCoach(true)}>فهمیدم</button>
          </p>
        )}
        <Couplets
          couplets={couplets}
          playing={mine ? player.couplet : -1}
          onPlayFrom={synced(mine ? player.recIdx : 0) ? (i) => play(entry, mine ? player.recIdx : 0, i) : undefined}
          credit={credit}
          url={link}
        />
      </div>

      {summary && (
        <details class="summary">
          <summary>خلاصهٔ شعر{summary.ai ? ' (هوش مصنوعی)' : ''}</summary>
          <p>{summary.text}</p>
        </details>
      )}

      <p class="credit">
        منبع: <a href={ganjoorUrl(poem.fullUrl)} target="_blank" rel="noopener noreferrer">گنجور</a>
        {poem.sourceName ? `، ${poem.sourceName}` : ''}
      </p>

      <nav class="poem-nav" aria-label="شعر قبلی و بعدی">
        {poem.previous ? (
          <a href={url('/poem/' + poem.previous.id)} rel="prev">
            <small>شعر قبلی</small>
            <b>{poem.previous.title}</b>
            <div class="excerpt muted small">{poem.previous.excerpt}</div>
          </a>
        ) : <span />}
        {poem.next ? (
          <a class="next" href={url('/poem/' + poem.next.id)} rel="next">
            <small>شعر بعدی</small>
            <b>{poem.next.title}</b>
            <div class="excerpt muted small">{poem.next.excerpt}</div>
          </a>
        ) : <span />}
      </nav>

      <Sheet open={more} onClose={() => setMore(false)} label="کارهای شعر">
        <h2 class="sheet-title">{poem.title}</h2>
        {recs.length > 0 && (
          <section class="sheet-section" aria-labelledby="recs-h">
            <h3 id="recs-h" class="sheet-kicker">خوانش{'\u200c'}ها</h3>
            <ReciterList recs={recs} current={mine ? player.recIdx : -1} onPick={(i) => { setMore(false); play(entry, i) }} />
          </section>
        )}
        <ul class="sheet-list">
          <li>
            <button type="button" class="sheet-row" onClick={() => share({ title: poem.fullTitle, text: `${couplets[0] ? couplets[0].a : ''}\nمنبع: گنجور (ganjoor.net${poem.fullUrl})`, url: link })}>
              <Icon name="share" size={20} /> <span>هم{'\u200c'}رسانی</span>
            </button>
          </li>
          <li>
            <button type="button" class="sheet-row" onClick={() => copyText(poemText(poem, couplets))}>
              <Icon name="copy" size={20} /> <span>رونوشت شعر</span>
            </button>
          </li>
          <li>
            <button type="button" class="sheet-row" aria-pressed={saved} onClick={onSave}>
              <Icon name={saved ? 'check' : 'offline'} size={20} /> <span>{saved ? 'ذخیره\u200cشده برای آفلاین (برداشتن)' : 'ذخیره برای خواندن آفلاین'}</span>
            </button>
          </li>
          <li>
            <a class="sheet-row" href={url('/settings')}>
              <Icon name="settings" size={20} /> <span>اندازه و خط شعر</span>
            </a>
          </li>
        </ul>
      </Sheet>
    </article>
  )
}
