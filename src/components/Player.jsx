import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import { url } from '../lib/base.js'
import { Icon } from './Icon.jsx'
import { Sheet } from './Sheet.jsx'
import { Sarlowh, Shamseh } from './Ornament.jsx'
import { usePlayer, toggle, seek, setRate, setAutoNext, stop, play } from '../lib/player.js'
import { useStored, BOOKMARKS, toggleBookmark } from '../lib/store.js'
import { coupletText, fmtTime, toFaDigits } from '../lib/poem.js'

const RATES = [0.75, 1, 1.25, 1.5]
const shortTitle = (t = '') => t.split('»').pop().trim()

/** Reciters of one poem as a pick list (player sheet and poem actions). */
export function ReciterList({ recs, current, onPick }) {
  return (
    <ul class="sheet-list" aria-label={"خوانش\u200cها"}>
      {recs.map((r, i) => (
        <li key={r.id}>
          <button type="button" class="sheet-row" aria-current={i === current ? 'true' : undefined} onClick={() => onPick(i)}>
            <Icon name={i === current ? 'check' : 'play'} size={18} fill={i !== current} />
            <span>{r.audioArtist}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function Beyt({ c, class: cls, textRef }) {
  return (
    <p class={cls} ref={textRef}>
      <span class="m">{c.a}</span>
      {c.b && <span class="m">{c.b}</span>}
    </p>
  )
}

/** 66px mini player above the tabs; tapping it opens the full, verse-synced player. */
export function Player() {
  const s = usePlayer()
  const ref = useRef(null)
  const [full, setFull] = useState(false)
  const [recs, setRecs] = useState(false)
  const [bookmarks] = useStored(BOOKMARKS, [])
  const poem = s.poem
  const cur = Math.max(0, s.couplet)
  const verseText = useRef(null)
  const previousVerse = useRef(null)

  // Let the page reserve room for the floating mini player (its height plus the gap above the tabs).
  useEffect(() => {
    const root = document.documentElement
    if (!poem || !ref.current) return root.style.setProperty('--player-h', '0px')
    const ro = new ResizeObserver(() => root.style.setProperty('--player-h', ref.current.offsetHeight + 10 + 'px'))
    ro.observe(ref.current)
    return () => {
      ro.disconnect()
      root.style.setProperty('--player-h', '0px')
    }
  }, [!!poem])
  useEffect(() => {
    if (!poem) setFull(false)
  }, [poem])
  useLayoutEffect(() => {
    const previous = previousVerse.current
    previousVerse.current = full ? { id: poem?.id, index: cur } : null
    if (!full || previous?.id !== poem?.id || previous?.index == null || previous.index === cur ||
        matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const offset = cur > previous.index ? 12 : -12
    const animation = verseText.current?.animate?.([
      { opacity: 0, transform: `translateY(${offset}px)` },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 260, easing: 'cubic-bezier(.2, .7, .25, 1)' })
    return () => animation?.cancel()
  }, [full, poem?.id, cur])

  if (!poem) return null
  const rec = poem.recs[s.recIdx]
  const n = poem.couplets.length
  const title = shortTitle(poem.title)
  const pct = s.dur ? Math.min(100, (s.time / s.dur) * 100) : 0
  const beyt = s.couplet >= 0 ? `بیت ${toFaDigits(s.couplet + 1)} از ${toFaDigits(n)}` : ''
  const status = s.error ? 'پخش نشد. اتصال را بررسی کنید.' : s.loading ? 'در حال آماده\u200cسازی' : [rec?.audioArtist, beyt].filter(Boolean).join(' · ')
  const playbackStatus = s.error || s.loading ? status : s.playing ? 'در حال پخش' : 'توقف پخش'
  const playLabel = s.error ? 'تلاش دوباره برای پخش' : s.playing ? 'توقف' : 'پخش'
  const bookmarked = bookmarks.some((b) => b.id === poem.id)
  const ref0 = () => ({
    id: poem.id, title: poem.title, poet: poem.poet, at: Date.now(),
    excerpt: poem.couplets[0] ? coupletText(poem.couplets[0]).replace('\n', ' / ') : '',
  })
  // Prev/next step by couplet when the recitation is synced, else by 10 seconds.
  const step = (d) => {
    if (s.starts) seek(s.starts[Math.min(n - 1, Math.max(0, (s.couplet < 0 ? -1 : s.couplet) + d))] / 1000)
    else seek(Math.max(0, s.time + d * 10))
  }

  return (
    <>
      <section class="mini lapis" ref={ref} aria-label={"پخش\u200cکنندهٔ خوانش"}>
        <button type="button" class="mini-play" onClick={toggle} aria-label={playLabel}>
          <Icon name={s.playing ? 'pause' : 'play'} size={20} fill={!s.playing} />
        </button>
        <button type="button" class="mini-open" aria-haspopup="dialog" aria-expanded={full} aria-label={`باز کردن پخش\u200cکننده، ${title}`} onClick={() => setFull(true)}>
          <span class="mini-text">
            <b>{title}</b>
            <span>{status}</span>
          </span>
          <Icon name="chevron" size={20} class="up" />
        </button>
        <span class="mini-progress" aria-hidden="true"><i style={{ width: pct + '%' }} /></span>
        <span class="sr-only" aria-live="polite">{s.error ? status : ''}</span>
      </section>

      <Sheet open={full} onClose={() => setFull(false)} label={"پخش\u200cکنندهٔ خوانش"} class="full-player lapis">
        <Shamseh class="fp-medallion" />
        <div class="fp-top">
          <button type="button" class="round-btn" onClick={() => setFull(false)} aria-label={"کوچک کردن پخش\u200cکننده"}>
            <Icon name="chevron" size={20} class="down" />
          </button>
          <div class="fp-now">
            <span class="fp-kicker" role="status">{playbackStatus}</span>
            <a href={url('/poem/' + poem.id)}>{poem.poet ? `${poem.poet} · ` : ''}{title}</a>
          </div>
          <button type="button" class="round-btn" onClick={stop} aria-label={"توقف و بستن پخش\u200cکننده"}>
            <Icon name="close" size={20} />
          </button>
        </div>

        <div class="fp-stage" aria-live="off">
          <div class="fp-neighbor">{cur > 0 && <Beyt c={poem.couplets[cur - 1]} class="fp-dim before" />}</div>
          {poem.couplets[cur] && (
            <div class="fp-current">
              <Sarlowh />
              <Beyt c={poem.couplets[cur]} class="fp-beyt" textRef={verseText} />
            </div>
          )}
          <div class="fp-neighbor">{poem.couplets[cur + 1] && <Beyt c={poem.couplets[cur + 1]} class="fp-dim" />}</div>
          {!s.starts && !s.loading && !s.error && <p class="fp-note">این خوانش با متن هم{'\u200c'}گام نیست؛ بیت{'\u200c'}ها همراهش جلو نمی{'\u200c'}روند.</p>}
        </div>

        <div class="fp-controls">
          <div class="fp-rec">
            <b>{rec?.audioArtist}</b>
            {poem.recs.length > 1 && (
              <button type="button" class="pill-btn" aria-haspopup="dialog" onClick={() => setRecs(true)}>
                خوانش{'\u200c'}ها <Icon name="chevron" size={14} class="down" />
              </button>
            )}
          </div>
          <div class="fp-seek">
            <input
              type="range"
              min="0"
              max={s.dur || 1}
              step="1"
              value={s.time}
              style={{ '--pct': pct + '%' }}
              onInput={(e) => seek(Number(e.currentTarget.value))}
              aria-label="جای پخش"
              aria-valuetext={`${fmtTime(s.time)} از ${fmtTime(s.dur)}`}
            />
            <div class="fp-times" aria-hidden="true"><span>{fmtTime(s.time)}</span><span>{fmtTime(s.dur)}</span></div>
          </div>
          <div class="fp-buttons">
            {poem.next ? (
              <button type="button" class="fp-btn toggle" aria-pressed={s.autoNext} aria-label="پخش خودکار شعر بعدی" onClick={() => setAutoNext(!s.autoNext)}>
                <Icon name="repeat" size={20} />
              </button>
            ) : <span class="fp-btn" />}
            <button type="button" class="fp-btn lg" onClick={() => step(-1)} aria-label={s.starts ? 'بیت قبلی' : 'ده ثانیه عقب'}>
              <Icon name="chevron" size={26} />
            </button>
            <button type="button" class="fp-play" onClick={toggle} aria-label={playLabel}>
              <Icon name={s.playing ? 'pause' : 'play'} size={30} fill={!s.playing} />
            </button>
            <button type="button" class="fp-btn lg" onClick={() => step(1)} aria-label={s.starts ? 'بیت بعدی' : 'ده ثانیه جلو'}>
              <Icon name="chevron" size={26} class="flip" />
            </button>
            <button type="button" class="fp-btn toggle bm" aria-pressed={bookmarked} aria-label="نشان کردن این شعر" onClick={() => toggleBookmark(ref0())}>
              <Icon name="bookmark" size={20} fill={bookmarked} />
            </button>
          </div>
          <div class="rates" role="group" aria-label="سرعت پخش">
            {RATES.map((r) => (
              <button type="button" key={r} aria-pressed={s.rate === r} onClick={() => setRate(r)}>
                {toFaDigits(r).replace('.', '٫')}×
              </button>
            ))}
          </div>
        </div>

        <Sheet open={recs} onClose={() => setRecs(false)} label={"خوانش\u200cها"}>
          <h2 class="sheet-title">خوانش{'\u200c'}ها</h2>
          <ReciterList recs={poem.recs} current={s.recIdx} onPick={(i) => { setRecs(false); play(poem, i) }} />
        </Sheet>
      </Sheet>
    </>
  )
}
