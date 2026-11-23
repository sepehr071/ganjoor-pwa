import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { LocationProvider, Router, Route, lazy, ErrorBoundary, useLocation } from 'preact-iso'
import { routes as exploreRoutes } from './explore/index.js'
import { Icon } from './components/Icon.jsx'
import { Emblem } from './components/Ornament.jsx'
import { Player } from './components/Player.jsx'
import { Sheet } from './components/Sheet.jsx'
import { useOnline, useToastHost, pageTitle } from './lib/hooks.js'
import { useStored, SETTINGS, DEFAULT_SETTINGS, applySettings } from './lib/store.js'
import { setNavigator } from './lib/player.js'
import { url, strip, sharedPath } from './lib/base.js'
import { listenWidgetLinks } from './lib/native.js'

const Home = lazy(() => import('./pages/Home.jsx'))
const Poets = lazy(() => import('./pages/Poets.jsx'))
const Poet = lazy(() => import('./pages/Poet.jsx'))
const Cat = lazy(() => import('./pages/Cat.jsx'))
const Poem = lazy(() => import('./pages/Poem.jsx'))
const Search = lazy(() => import('./pages/Search.jsx'))
const Faal = lazy(() => import('./pages/Faal.jsx'))
const Random = lazy(() => import('./pages/Random.jsx'))
const Bookmarks = lazy(() => import('./pages/Bookmarks.jsx'))
const Offline = lazy(() => import('./pages/Offline.jsx'))
const History = lazy(() => import('./pages/History.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))
const About = lazy(() => import('./pages/About.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))

const NAV = [
  { href: '/', label: 'خانه', icon: 'home' },
  { href: '/poets', label: 'شاعران', icon: 'poets' },
  { href: '/search', label: 'جستجو', icon: 'search' },
  { href: '/bookmarks', label: 'نشان\u200cشده\u200cها', icon: 'bookmark' },
]
const MORE = [
  { href: '/faal', label: 'فال حافظ' },
  { href: '/random', label: 'یک شعر تصادفی' },
  { href: '/history', label: 'خوانده\u200cشده\u200cها' },
  { href: '/offline', label: 'کتابخانهٔ آفلاین' },
  { href: '/settings', label: 'تنظیمات' },
  { href: '/about', label: 'درباره بیت' },
]
const explore = exploreRoutes.filter((r) => r.nav)
// Pages that draw their own top bar on a phone (hero, app bar), so the site header steps aside there.
const OWN_BAR = /^\/(poet|poem)\/|^\/$/
const EXT = { target: '_blank', rel: 'noopener noreferrer' }

const toRegex = (p) => new RegExp('^' + p.replace(/:[^/]+/g, '[^/]+') + '/?$')
const exploreMatchers = exploreRoutes.map((r) => [toRegex(r.path), r])

function Shell() {
  const { path, route } = useLocation()
  const [hub, setHub] = useState(false)
  const online = useOnline()
  const toastMsg = useToastHost()
  const [settings] = useStored(SETTINGS, DEFAULT_SETTINGS)
  const mainRef = useRef(null)
  const toastRef = useRef(null)

  useEffect(() => {
    const t = toastRef.current
    if (!t?.showPopover) return
    if (t.matches(':popover-open')) t.hidePopover()
    if (toastMsg) t.showPopover() // re-shown so it sits above a sheet opened since
  }, [toastMsg])
  useEffect(() => applySettings({ ...DEFAULT_SETTINGS, ...settings }), [settings])
  useEffect(() => { setNavigator((p) => route(p)) }, [route]) // braces: the returned fn would run as cleanup
  const widgetRoute = useRef(route)
  widgetRoute.current = route
  useEffect(() => listenWidgetLinks((path) => widgetRoute.current(path)), [])
  useEffect(() => {
    setHub(false)
    mainRef.current?.focus({ preventScroll: true })
    const hit = exploreMatchers.find(([re]) => re.test(path))
    if (hit) document.title = pageTitle(hit[1].title)
  }, [path])

  const current = (href) => (href === '/' ? path === '/' : path === href || path.startsWith(href + '/'))
  const onExplore = [...explore.map((r) => r.path), ...MORE.map((r) => r.href)].some((p) => current(p.replace(/\/:.*$/, '')))
  const bleed = path === '/' || path.startsWith('/poet/')

  return (
    <div class="app" data-bar={OWN_BAR.test(path) ? 'own' : undefined}>
      <a class="skip-link" href="#main">رفتن به محتوا</a>
      <header class="site-header">
        <a class="brand" href={url('/')} aria-label="بیت، صفحهٔ نخست">
          <Emblem />
          <span class="brand-word" aria-hidden="true">بیت</span>
        </a>
        <nav class="nav" aria-label={"بخش\u200cهای اصلی"}>
          {NAV.map((n) => (
            <a key={n.href} href={url(n.href)} aria-current={current(n.href) ? 'page' : undefined}>
              <span class="nav-ico"><Icon name={n.icon} size={22} /></span>
              {n.label}
            </a>
          ))}
          <button
            type="button"
            class="nav-btn"
            aria-haspopup="dialog"
            aria-expanded={hub}
            aria-current={onExplore ? 'page' : undefined}
            onClick={() => setHub(true)}
          >
            <span class="nav-ico"><Icon name="more" size={22} /></span>
            کاوش
          </button>
        </nav>
        <a class="round-btn hdr-settings" href={url('/settings')} aria-label="تنظیمات" aria-current={current('/settings') ? 'page' : undefined}>
          <Icon name="settings" size={21} />
        </a>
      </header>
      <Sheet open={hub} onClose={() => setHub(false)} label="کاوش و بیشتر" class="hub">
        <h2 class="sheet-title">کاوش در ادبیات</h2>
        <ul class="hub-grid">
          {explore.map((r) => (
            <li key={r.path}>
              <a class="hub-card" href={url(r.path)} aria-current={current(r.path) ? 'page' : undefined}>
                <span class="rosette" aria-hidden="true" />
                <b>{r.title}</b>
                {r.description && <small>{r.description}</small>}
              </a>
            </li>
          ))}
        </ul>
        <h2 class="sheet-kicker">بیشتر</h2>
        <ul class="list">
          {MORE.map((r) => (
            <li key={r.href}>
              <a class="list-link" href={url(r.href)} aria-current={current(r.href) ? 'page' : undefined}>
                <span class="list-main list-title">{r.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </Sheet>
      {!online && (
        <div class="offline-banner" role="status">
          آفلاین هستید. <a href={url('/offline')}>کتابخانهٔ آفلاین</a>
        </div>
      )}
      <main id="main" tabIndex={-1} ref={mainRef} class={bleed ? 'bleed' : path === '/poets' ? 'wide' : path.startsWith('/poem/') || path === '/faal' ? 'read' : ''}>
        <ErrorBoundary>
          <Router>
            <Route path="/" component={Home} />
            <Route path="/poets" component={Poets} />
            <Route path="/poet/:id" component={Poet} />
            <Route path="/cat/:id" component={Cat} />
            <Route path="/poem/:id" component={Poem} />
            <Route path="/search" component={Search} />
            <Route path="/faal" component={Faal} />
            <Route path="/random" component={Random} />
            <Route path="/bookmarks" component={Bookmarks} />
            <Route path="/offline" component={Offline} />
            <Route path="/history" component={History} />
            <Route path="/settings" component={Settings} />
            <Route path="/about" component={About} />
            {exploreRoutes.map((r) => (
              <Route key={r.path} path={r.path} component={r.component} />
            ))}
            <Route default component={NotFound} />
          </Router>
        </ErrorBoundary>
      </main>
      <footer class="site-footer">
        <span class="band" aria-hidden="true" />
        <p>
          {'بیت برنامه\u200cای مستقل و غیررسمی است و همهٔ متن\u200cها و داده\u200cهایش از داده\u200cهای باز و API عمومی '}
          <a href="https://ganjoor.net" {...EXT}>گنجور (ganjoor.net)</a>
          {' است. این برنامه را گنجور نساخته و تأیید نکرده است؛ برای پشتیبانی با سازندهٔ آن تماس بگیرید، نه با گنجور. '}
          <a href={url('/about')}>درباره بیت</a>
        </p>
        <p class="credit-line">
          {'طراحی و ساخت: سپهر رادمرد، '}
          <a href="https://github.com/sepehr071" {...EXT}>GitHub</a>
          {'، '}
          <a href="https://www.linkedin.com/in/sepehr-radmard" {...EXT}>LinkedIn</a>
        </p>
        <p lang="en" dir="ltr" class="small en">Designed and built by Sepehr Radmard</p>
        <p>{'بدون ردیاب و بدون آمارگیر. نشان\u200cها و تنظیمات فقط در همین دستگاه می\u200cمانند.'}</p>
      </footer>
      <Player />
      {/* a manual popover: top layer, so it also shows above an open sheet */}
      <div class="toast" role="status" popover="manual" ref={toastRef}>{toastMsg}</div>
    </div>
  )
}

// preact-iso has no base option: everything below sees paths without the base, and route() adds it back.
function BaseLocation({ children }) {
  const loc = useLocation()
  const value = useMemo(() => {
    const path = strip(loc.path)
    const resolved = sharedPath(path, loc.query.read)
    return { ...loc, url: resolved === path ? strip(loc.url) : resolved, path: resolved, route: (u, replace) => loc.route(url(u), replace) }
  }, [loc])
  return <LocationProvider.ctx.Provider value={value}>{children}</LocationProvider.ctx.Provider>
}

export function App() {
  return (
    <LocationProvider>
      <BaseLocation>
        <Shell />
      </BaseLocation>
    </LocationProvider>
  )
}
