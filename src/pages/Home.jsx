import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import { useLocation } from 'preact-iso'
import { url } from '../lib/base.js'
import { routes as exploreRoutes } from '../explore/index.js'
import { getPoem, getPoets, poetImage } from '../api.js'
import { useAsync, useTitle, share } from '../lib/hooks.js'
import { useStored, HISTORY, BOOKMARKS, toggleBookmark } from '../lib/store.js'
import { coupletText, groupCouplets, poetName, toFaDigits } from '../lib/poem.js'
import { todayPoem } from '../lib/dailyPoems.js'
import { usePlayer, play, toggle } from '../lib/player.js'
import { Icon } from '../components/Icon.jsx'
import { Arch } from '../components/Arch.jsx'
import { GetApp } from '../components/GetApp.jsx'
import { Emblem, Shamseh } from '../components/Ornament.jsx'

const lastPart = (t = '') => t.split('»').pop().trim()
const playingPoem = (s) => s.poem?.id
const isPlaying = (s) => s.playing
const explore = exploreRoutes.filter((r) => r.nav)
const SHORT_HOME = '(max-width: 47.99rem) and (max-height: 45rem)'

function Hero({ search }) {
  const [day, setDay] = useState(() => new Date().toDateString())
  useEffect(() => {
    let timer
    const refresh = () => {
      clearTimeout(timer)
      const now = new Date()
      setDay(now.toDateString())
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      timer = setTimeout(refresh, midnight.getTime() - now.getTime())
    }
    refresh()
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  const { data: t, error } = useAsync(() => todayPoem(), [day])
  // The full poem (recitations) is only needed for the listen button.
  const { data: full } = useAsync((signal) => (t ? getPoem(t.id, { signal }) : Promise.resolve(null)), [t?.id])
  const [bookmarks] = useStored(BOOKMARKS, [])
  const playerPoem = usePlayer(playingPoem)
  const playing = usePlayer(isPlaying)
  const c = t?.couplet
  const recs = (full?.recitations || []).filter((r) => r.mp3Url)
  const mine = t && playerPoem === t.id
  const date = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' }).format(new Date())
  const bookmarked = t && bookmarks.some((b) => b.id === t.id)

  const listen = () => {
    if (mine) return toggle()
    const couplets = groupCouplets(full.verses || [])
    const at = couplets.findIndex((x) => x.a === c.a)
    play({ id: full.id, title: full.fullTitle, poet: poetName(full), next: full.next, couplets, recs }, 0, at)
  }

  return (
    <div class={`hero lapis${search ? ' hero-short' : ''}`}>
      <div class="hero-bar">
        <Emblem />
        <span class="brand-word" aria-hidden="true">بیت</span>
        <a class="round-btn" href={url('/settings')} aria-label="تنظیمات"><Icon name="settings" size={21} /></a>
      </div>
      {search}
      <section class="hero-spread" aria-labelledby="hero-t" aria-busy={!c && !error}>
        <div class="hero-copy">
          <div class="hero-heading">
            <h2 id="hero-t" class="hero-title">بیت امروز</h2>
            <span class="hero-date">{date}</span>
          </div>
          <blockquote class="hero-beyt" aria-hidden={!c || undefined}>
            {c && <span class="m">{c.a}</span>}
            {c?.b && <span class="m">{c.b}</span>}
          </blockquote>
          <p class="hero-meta">
            {error ? 'بیت امروز بارگیری نشد.' : c && <span>{t.poet} · {lastPart(t.title)}</span>}
          </p>
          <div class="hero-actions">
            {c && (
              <>
                <a class="btn gold" href={url('/poem/' + t.id)}>خواندن شعر</a>
                {recs.length > 0 && (
                  <button type="button" class="btn primary" onClick={listen}>
                    <Icon name={mine && playing ? 'pause' : 'play'} size={18} fill={!(mine && playing)} />
                    {mine && playing ? 'توقف' : 'گوش دادن'}
                  </button>
                )}
                <button type="button" class="round-btn bm" aria-pressed={!!bookmarked} aria-label="نشان کردن بیت امروز"
                  onClick={() => toggleBookmark({ id: t.id, title: t.title, poet: t.poet, excerpt: coupletText(c).replace('\n', ' / '), at: Date.now() })}>
                  <Icon name="bookmark" size={20} fill={!!bookmarked} />
                </button>
                <button type="button" class="round-btn" aria-label={"هم\u200cرسانی بیت امروز"}
                  onClick={() => share({ title: t.title, text: `${coupletText(c)}\n— ${t.title}، گنجور`, url: location.origin + url('/poem/' + t.id) })}>
                  <Icon name="share" size={20} />
                </button>
              </>
            )}
          </div>
        </div>
        <img class="hero-plate" src={url('/art/garden-illustration.webp')} width="1000" height="750" alt="" fetchpriority="high" />
      </section>
    </div>
  )
}

function ContinueCard({ h }) {
  const pct = h.total ? Math.round((Math.min(h.pos, h.total) / h.total) * 100) : 0
  return (
    <a class="cont-card" href={url('/poem/' + h.id)}>
      <Arch src={h.img && poetImage({ imageUrl: h.img })} name={h.poet} class="sm" />
      <span class="list-main">
        <span class="list-title">{lastPart(h.title)}</span>
        <span class="list-sub">{[h.poet, h.excerpt].filter(Boolean).join(' · ')}</span>
        {h.total > 0 && (
          <span class="progress">
            <span class="bar" aria-hidden="true"><i style={{ width: pct + '%' }} /></span>
            <span>بیت {toFaDigits(h.pos)} از {toFaDigits(h.total)}</span>
          </span>
        )}
      </span>
    </a>
  )
}

export default function Home() {
  useTitle('')
  const { route } = useLocation()
  const searchInput = useRef(null)
  const [searchLayout, setSearchLayout] = useState(() => ({ short: matchMedia(SHORT_HOME).matches, draft: '', focused: false }))
  const [history] = useStored(HISTORY, [])
  const { data: poets } = useAsync((signal) => getPoets({ signal }), [])
  const famous = (poets || []).filter((p) => p.pinOrder > 0).sort((a, b) => a.pinOrder - b.pinOrder).slice(0, 12)

  useEffect(() => {
    const media = matchMedia(SHORT_HOME)
    const sync = () => {
      const input = searchInput.current
      setSearchLayout((layout) => !input || layout.short === media.matches ? layout : {
        short: media.matches,
        draft: input.value,
        focused: document.activeElement === input,
      })
    }
    media.addEventListener('change', sync)
    sync()
    return () => media.removeEventListener('change', sync)
  }, [])
  useLayoutEffect(() => {
    if (searchLayout.focused) searchInput.current?.focus({ preventScroll: true })
  }, [searchLayout])

  const search = (
    <form class="search-pill" role="search" onSubmit={(e) => {
      e.preventDefault()
      const q = new FormData(e.currentTarget).get('q').toString().trim()
      route('/search' + (q ? '?q=' + encodeURIComponent(q) : ''))
    }}>
      <label class="sr-only" for="home-q">جستجو در شعرها</label>
      <input id="home-q" name="q" type="search" ref={searchInput} defaultValue={searchLayout.draft}
        placeholder="جستجو در شعرها" enterkeyhint="search" />
      <button class="btn primary icon" type="submit" aria-label="جستجو"><Icon name="search" size={20} /></button>
    </form>
  )

  return (
    <div class="home">
      <h1 class="sr-only">بیت: شعر فارسی بر پایهٔ گنجور</h1>
      <Hero search={searchLayout.short ? search : null} />
      <div class="home-body wrap stack-lg">
        {!searchLayout.short && search}

        <nav class="quick" aria-label="شروع سریع">
          <a class="btn browse-poets" href={url('/poets')}><Icon name="poets" size={20} />مرور شاعران و آثارشان</a>
          <a class="rich faal" href={url('/faal')}>
            <Shamseh class="rich-art" />
            <b>فال حافظ</b>
            <small>نیت کنید و غزلی بگیرید</small>
          </a>
          <a class="rich random" href={url('/random')}>
            <span class="rich-art" aria-hidden="true" />
            <b>شعر تصادفی</b>
            <small>از هر شاعری</small>
          </a>
        </nav>

        {history.length > 0 && (
          <section aria-labelledby="cont-h">
            <div class="section-title">
              <h2 id="cont-h">ادامهٔ خواندن</h2>
              <a href={url('/history')} class="more-link">همه</a>
            </div>
            <ContinueCard h={history[0]} />
          </section>
        )}

        <section class="home-explore" aria-labelledby="home-explore-h">
          <div class="section-title"><h2 id="home-explore-h">کاوش در ادبیات</h2></div>
          <ul class="hub-grid">
            {explore.map(({ path, title, description }) => (
              <li key={path}>
                <a class="hub-card" href={url(path)}>
                  <span class="rosette" aria-hidden="true" />
                  <b>{title}</b>
                  <small>{description}</small>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="poets-h">
          <div class="section-title">
            <h2 id="poets-h">شاعران</h2>
            <a href={url('/poets')} class="more-link">همهٔ شاعران</a>
          </div>
          {famous.length > 0 && (
            <ul class="carousel">
              {famous.map((p) => (
                <li key={p.id}>
                  <a class="poet-tile" href={url('/poet/' + p.id)}>
                    <Arch src={poetImage(p)} name={p.nickname || p.name} />
                    {p.nickname || p.name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <GetApp />
      </div>
    </div>
  )
}
