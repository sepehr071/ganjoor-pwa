import { useEffect, useMemo, useState } from 'preact/hooks'
import { getPoem } from '../api.js'
import { useAsync, useTitle, share, copyText, toast } from '../lib/hooks.js'
import {
  useStored, BOOKMARKS, COACH, toggleBookmark, pushHistory, updateHistory,
  savedPoemGet, savedPoemPut, savedPoemDelete, savedAudioIds,
} from '../lib/store.js'
import {
  groupCouplets, coupletsFromPlain, parseMeaning, sectionMeters, poemText, poemRef, poetName, ganjoorUrl, toFaDigits,
} from '../lib/poem.js'
import { getLiteraryAnnotations } from '../lib/literary.js'
import { usePlayer, play } from '../lib/player.js'
import { url } from '../lib/base.js'
import { Icon } from '../components/Icon.jsx'
import { Couplets, LiteraryAnnotations } from '../components/Couplets.jsx'
import { PoemArt } from '../components/PoemArt.jsx'
import { Sheet } from '../components/Sheet.jsx'
import { ReciterList } from '../components/Player.jsx'
import { OfflineRecitations } from '../components/OfflineRecitations.jsx'
import { BackButton } from '../components/BackButton.jsx'
import { Sarlowh } from '../components/Ornament.jsx'
import { Loading, ErrorState } from '../components/Status.jsx'

// Falls back to the copy saved for offline when the network call fails.
async function loadPoem(id, signal) {
  if (!navigator.onLine) {
    const saved = await savedPoemGet(id)
    if (saved) return { ...saved, _fromSaved: true }
  }
  try {
    return await getPoem(id, { signal })
  } catch (e) {
    const saved = await savedPoemGet(id)
    if (saved) return { ...saved, _fromSaved: true }
    throw e
  }
}

const currentPoemId = (s) => s.poem?.id
const currentReciter = (s) => s.recIdx
const currentVerse = (s) => s.couplet

function PoemMeters({ meters }) {
  if (!meters.length) return null
  return meters.map(({ id, rhythm, rhyme, range }, i) => (
    <div class="folio-meta" key={i}>
      {meters.length > 1 && range && (
        <span class="chip static">{range[0] === range[1] ? `بیت ${toFaDigits(range[0])}` : `بیت ${toFaDigits(range[0])} تا ${toFaDigits(range[1])}`}</span>
      )}
      {rhythm && (id
        ? <a class="chip" href={url('/meters/' + id)}>وزن: {rhythm}</a>
        : <span class="chip static">وزن: {rhythm}</span>)}
      {rhyme && <span class="chip static">قافیه: {rhyme}</span>}
    </div>
  ))
}

export default function Poem({ id }) {
  const { data: poem, error, loading, retry } = useAsync((signal) => loadPoem(id, signal), [id])
  const [bookmarks] = useStored(BOOKMARKS, [])
  const [coach, setCoach] = useStored(COACH, false)
  const [saved, setSaved] = useState(false)
  const [savedAudio, setSavedAudio] = useState([])
  const [more, setMore] = useState(false)
  const [offlineAudio, setOfflineAudio] = useState(false)
  const playingPoem = usePlayer(currentPoemId)
  const recIdx = usePlayer(currentReciter)
  const playingVerse = usePlayer(currentVerse)

  const couplets = useMemo(
    () => (poem ? (poem.verses?.length ? groupCouplets(poem.verses) : coupletsFromPlain(poem.plainText).map((c) => ({ ...c, vOrders: [], single: !c.b }))) : []),
    [poem],
  )
  const { data: literary, loading: literaryLoading } = useAsync(async (signal) => {
    if (!poem || !navigator.onLine) return null
    return { id: poem.id, tags: await getLiteraryAnnotations(poem.id, couplets, signal) }
  }, [poem])
  const annotations = !literaryLoading && literary && literary.id === poem?.id ? literary.tags : null
  const recs = useMemo(() => (poem?.recitations || []).filter((r) => r.mp3Url), [poem])
  const entry = useMemo(
    () => poem && { id: poem.id, title: poem.fullTitle, poet: poetName(poem), next: poem.next, couplets, recs },
    [poem, couplets, recs],
  )

  useTitle(poem && `${poem.title} ${poetName(poem)}`)
  useEffect(() => {
    if (!poem || !/^#b\d+$/.test(location.hash)) return
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'center' })
  }, [poem?.id])
  useEffect(() => {
    if (!poem) return
    let active = true
    pushHistory(poemRef(poem, couplets))
    Promise.all([savedPoemGet(poem.id), savedAudioIds(poem.id)]).then(([snapshot, audio]) => {
      if (!active) return
      setSaved(Boolean(snapshot))
      setSavedAudio(audio)
    })
    // Reading position for "continue reading": the furthest couplet that has been on screen.
    let max = 0
    const io = new IntersectionObserver((es) => {
      const seen = Math.max(max, ...es.filter((e) => e.isIntersecting).map((e) => Number(e.target.id.slice(1))))
      if (seen > max) updateHistory(poem.id, { pos: (max = seen), total: couplets.length })
    })
    document.querySelectorAll('.poem-body .couplet').forEach((el) => io.observe(el))
    return () => {
      active = false
      io.disconnect()
    }
  }, [poem])

  if (loading) return <Loading label="در حال بارگیری شعر" />
  if (error) return <ErrorState error={error} onRetry={retry} />

  const cat = poem.category?.cat
  const poet = poem.category?.poet
  const book = cat?.ancestors?.length ? cat : null // a category without ancestors is the poet itself
  const bookmarked = bookmarks.some((b) => b.id === poem.id)
  const meters = sectionMeters(poem)
  const summary = parseMeaning(poem.poemSummary)
  const mine = playingPoem === poem.id
  const firstOfflineRec = recs.findIndex((r) => savedAudio.includes(r.id))
  const preferredRec = mine ? recIdx : Math.max(0, firstOfflineRec)
  const synced = (i) => recs[i]?.inSyncWithText && couplets[0]?.vOrders?.length
  const link = location.origin + url('/poem/' + poem.id)
  const credit = `${poem.fullTitle}، گنجور`
  const poetLabel = poet?.nickname || poet?.name

  const onSave = async () => {
    try {
      if (saved) await savedPoemDelete(poem.id)
      else await savedPoemPut(poem)
      setSaved(!saved)
      if (saved) setSavedAudio([])
      toast(saved ? 'از حافظهٔ آفلاین برداشته شد' : 'برای خواندن آفلاین ذخیره شد')
    } catch {
      toast('ذخیره در این مرورگر ممکن نیست')
    }
  }

  const refreshOffline = async () => {
    setSavedAudio(await savedAudioIds(poem.id))
    setSaved(true)
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
          <PoemMeters meters={meters} />
          {poem._fromSaved && (
            <div class="folio-meta">
              <span class="chip static">نسخهٔ ذخیره{'\u200c'}شده برای آفلاین</span>
            </div>
          )}
          <div class="row poem-audio-actions">
            {recs.length > 0 && (
              <>
                {!mine && (
                  <button type="button" class="btn primary listen" onClick={() => play(entry, preferredRec)}>
                    <Icon name="play" size={18} fill /> گوش دادن
                  </button>
                )}
                <button type="button" class="btn" aria-haspopup="dialog" onClick={() => setOfflineAudio(true)}>
                  <Icon name={savedAudio.length ? 'check' : 'offline'} size={18} /> خوانش آفلاین
                </button>
              </>
            )}
            <a class="btn" href={url('/settings#rd')}><Icon name="settings" size={18} />خط و اندازهٔ شعر</a>
          </div>
        </header>
        <PoemArt id={poem.id} />
        {!coach && (
          <p class="coach" role="note">
            روی هر بیت بزنید تا معنی و آرایه{'\u200c'}های ثبت{'\u200c'}شدهٔ آن را ببینید.
            <button type="button" class="btn link" onClick={() => setCoach(true)}>فهمیدم</button>
          </p>
        )}
        <Couplets
          couplets={couplets}
          playing={mine ? playingVerse : -1}
          onPlayFrom={synced(preferredRec) ? (i) => play(entry, preferredRec, i) : undefined}
          annotations={annotations}
          credit={credit}
          url={link}
        />
      </div>

      {annotations?.get(-1)?.length > 0 && (
        <details class="summary">
          <summary>آرایه{'\u200c'}های کل شعر</summary>
          <LiteraryAnnotations items={annotations.get(-1)} />
        </details>
      )}

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
            <ReciterList recs={recs} current={mine ? recIdx : -1} onPick={(i) => { setMore(false); play(entry, i) }} />
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
              <Icon name={saved ? 'check' : 'offline'} size={20} /> <span>{saved ? (savedAudio.length ? 'پاک کردن شعر و خوانش‌ها از آفلاین' : 'پاک کردن شعر از آفلاین') : 'ذخیره برای خواندن آفلاین'}</span>
            </button>
          </li>
        </ul>
      </Sheet>
      {recs.length > 0 && (
        <OfflineRecitations key={poem.id} open={offlineAudio} onClose={() => setOfflineAudio(false)} poem={poem}
          recs={recs} saved={savedAudio} onChange={refreshOffline} onPlay={(i) => { setOfflineAudio(false); play(entry, i) }} />
      )}
    </article>
  )
}
