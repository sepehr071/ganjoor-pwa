// Contract between the app shell (src/app.jsx, owned by the core build) and the explore section (src/explore/**).
// The shell imports `routes` and mounts each entry under preact-iso's <Router> as <Route path={r.path} component={r.component} />,
// and lists entries with `nav: true` in the "Explore" menu using `title` and `icon` (a single emoji-free short label is fine).
// Components get route params as props (preact-iso), and navigate with useLocation().route(path) or plain <a href>.
// Shell routes explore pages may link to: /poet/:id, /cat/:id, /poem/:id, /search?q=
// `icon` is a plain key (meter, people, museum, places, literary, words), not an emoji; pages are code-split with lazy().
import { lazy } from 'preact-iso'

const Meters = lazy(() => import('./Meters.jsx').then((m) => m.Meters))
const MeterDetail = lazy(() => import('./Meters.jsx').then((m) => m.MeterDetail))
const People = lazy(() => import('./People.jsx').then((m) => m.People))
const PersonDetail = lazy(() => import('./People.jsx').then((m) => m.PersonDetail))
const Museum = lazy(() => import('./Museum.jsx').then((m) => m.Museum))
const MuseumDetail = lazy(() => import('./Museum.jsx').then((m) => m.MuseumDetail))
const Places = lazy(() => import('./Places.jsx').then((m) => m.Places))
const Literary = lazy(() => import('./Literary.jsx').then((m) => m.Literary))
const Words = lazy(() => import('./Words.jsx').then((m) => m.Words))

export const routes = [
  { path: '/literary', title: 'آرایه\u200cها', description: 'تشبیه، استعاره و دیگر آرایه\u200cها', icon: 'literary', nav: true, component: Literary },
  { path: '/meters', title: 'وزن\u200cها', description: 'شعرهای هم\u200cوزن و هم\u200cقافیه', icon: 'meter', nav: true, component: Meters },
  { path: '/meters/:id', title: 'وزن', icon: 'meter', nav: false, component: MeterDetail },
  { path: '/people', title: 'شخصیت\u200cها', description: 'شخصیت\u200cها و شجره\u200cنامهٔ آن\u200cها', icon: 'people', nav: true, component: People },
  { path: '/people/:id', title: 'شخصیت', icon: 'people', nav: false, component: PersonDetail },
  { path: '/museum', title: 'موزه', description: 'نسخه\u200cهای خطی و چاپ\u200cهای کهن', icon: 'museum', nav: true, component: Museum },
  { path: '/museum/:slug', title: 'نسخه', icon: 'museum', nav: false, component: MuseumDetail },
  { path: '/places', title: 'مکان\u200cها', description: 'جاهایی که در شعرها آمده', icon: 'places', nav: true, component: Places },
  { path: '/words/:catId', title: 'بسامد واژه\u200cها', icon: 'words', nav: false, component: Words },
]
