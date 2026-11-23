// The app is served under Vite's `base` ('/' locally and on Android, '/ganjoor-pwa/' on GitHub Pages).
// App code keeps root paths ('/poem/1'); url() adds the base for links, strip() removes it for routing.
export const BASE = import.meta.env.BASE_URL
const b = BASE.replace(/\/$/, '')

export const url = (path) => BASE + path.replace(/^\//, '')

export const strip = (path) =>
  b && (path === b || path.startsWith(b + '/') || path.startsWith(b + '?')) ? '/' + path.slice(b.length).replace(/^\//, '') : path

const shareable = /^\/(?:poem|poet)\/[1-9]\d*\/?$/
const publicEntry = 'https://sepehr071.github.io/ganjoor-pwa/'

// GitHub Pages serves the entry document with HTTP 200 even on a first visit.
export function sharedLink(href, origin, native) {
  const source = new URL(href)
  const path = strip(source.pathname)
  if (source.origin !== origin || !shareable.test(path)) return href
  const entry = new URL(native ? publicEntry : BASE, origin)
  entry.searchParams.set('read', path)
  entry.hash = source.hash
  return entry.href
}

export function sharedPath(path, read) {
  return path === '/' && shareable.test(read) ? read.replace(/\/$/, '') : path
}
