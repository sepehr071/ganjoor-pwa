// The app is served under Vite's `base` ('/' locally and on Android, '/ganjoor-pwa/' on GitHub Pages).
// App code keeps root paths ('/poem/1'); url() adds the base for links, strip() removes it for routing.
export const BASE = import.meta.env.BASE_URL
const b = BASE.replace(/\/$/, '')

export const url = (path) => BASE + path.replace(/^\//, '')

export const strip = (path) =>
  b && (path === b || path.startsWith(b + '/') || path.startsWith(b + '?')) ? '/' + path.slice(b.length).replace(/^\//, '') : path
