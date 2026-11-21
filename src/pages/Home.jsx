import { useLocation } from 'preact-iso'
import { url } from '../lib/base.js'
import { getPoem, getPoets, getRandomPoem, poetImage } from '../api.js'
import { useAsync, useTitle, share } from '../lib/hooks.js'
import { useStored, HISTORY, BOOKMARKS, read, write, toggleBookmark } from '../lib/store.js'
import { coupletsFromPlain, coupletText, groupCouplets, poetName, toFaDigits } from '../lib/poem.js'
import { usePlayer, play, toggle } from '../lib/player.js'
import { Icon } from '../components/Icon.jsx'
import { Arch } from '../components/Arch.jsx'
import { GetApp } from '../components/GetApp.jsx'
import { Emblem, Sarlowh, Shamseh } from '../components/Ornament.jsx'

const TODAY = 'beyt:today'
const lastPart = (t = '') => t.split('»').pop().trim()

// One random poem per calendar day, kept on this device so the hero does not change on every visit.
async function todayPoem(signal) {
  const day = new Date().toDateString()
  const saved = read(TODAY, null)
  if (saved?.day === day) return saved.poem
  const p = await getRandomPoem(0, { signal })
  const couplets = p.verses?.length ? groupCouplets(p.verses) : coupletsFromPlain(p.plainText)
  const poem = {
    id: p.id,
    title: p.fullTitle,
    poet: p.category?.poet?.nickname || p.fullTitle.split('»')[0].trim(),
    couplet: couplets[Math.floor(couplets.length / 3)] || couplets[0],
  }
  write(TODAY, { day, poem })
  return poem
}

function Hero() {
  const { data: t, error } = useAsync(todayPoem, [])
  // The full poem (recitations) is only needed for the listen button.
  const { data: full } = useAsync((signal) => (t ? getPoem(t.id, { signal }) : Promise.resolve(null)), [t?.id])
  const [bookmarks] = useStored(BOOKMARKS, [])
  const player = usePlayer()
  const c = t?.couplet
  const recs = (full?.recitations || []).filter((r) => r.mp3Url)
  const mine = t && player.poem?.id === t.id
  const date = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' }).format(new Date())
  const bookmarked = t && bookmarks.some((b) => b.id === t.id)

  const listen = () => {
    if (mine) return toggle()
    const couplets = groupCouplets(full.verses || [])
    const at = couplets.findIndex((x) => x.a === c.a)
    play({ id: full.id, title: full.fullTitle, poet: poetName(full), next: full.next, couplets, recs }, 0, at)
  }

  return (
    <section class="hero lapis" aria-labelledby="hero-t" aria-busy={!c && !error}>
      <div class="hero-bar">
        <Emblem />
        <span class="brand-word" aria-hidden="true">گنجور</span>
        <a class="round-btn" href={url('/settings')} aria-label="تنظیمات"><Icon name="settings" size={21} /></a>
      </div>
      <Sarlowh />
      <h2 id="hero-t" class="hero-title">بیت امروز · {date}</h2>
      {error && <p class="hero-meta">بیت امروز بارگیری نشد. اتصال را بررسی کنید و صفحه را دوباره باز کنید.</p>}
      {!error && !c && <p class="hero-beyt" aria-hidden="true" />}
      {c && (
        <>
          <p class="hero-beyt">
            <span class="m">{c.a}</span>
            {c.b && <span class="m">{c.b}</span>}
          </p>
          <p class="hero-meta">
            <a href={url('/poem/' + t.id)}>{t.poet} · {lastPart(t.title)}</a>
          </p>
          <div class="hero-actions">
            {recs.length > 0 && (
              <button type="button" class="btn primary" onClick={listen}>
                <Icon name={mine && player.playing ? 'pause' : 'play'} size={18} fill={!(mine && player.playing)} />
                {mine && player.playing ? 'توقف' : 'گوش دادن'}
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
          </div>
        </>
      )}
      <span class="band" aria-hidden="true" />
    </section>
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
  const [history] = useStored(HISTORY, [])
  const { data: poets } = useAsync((signal) => getPoets({ signal }), [])
  const famous = (poets || []).filter((p) => p.pinOrder > 0).sort((a, b) => a.pinOrder - b.pinOrder).slice(0, 12)

  return (
    <div class="home">
      <h1 class="sr-only">گنجور، نسخهٔ پیشنهادی PWA</h1>
      <Hero />
      <div class="home-body wrap stack-lg">
        <form
          class="search-pill"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            const q = new FormData(e.currentTarget).get('q').toString().trim()
            route('/search' + (q ? '?q=' + encodeURIComponent(q) : ''))
          }}
        >
          <Icon name="search" size={20} />
          <label class="sr-only" for="home-q">جستجو در شعرها</label>
          <input id="home-q" name="q" type="search" placeholder="یک واژه، یک حس، یک مصرع…" enterkeyhint="search" />
        </form>

        <nav class="quick" aria-label="شروع سریع">
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
