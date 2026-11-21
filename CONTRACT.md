# Ganjoor PWA proposal: contract for parallel builders

A proposed, unofficial PWA edition of Ganjoor on the public Ganjoor API ("نسخهٔ پیشنهادی PWA برای گنجور"). Own
hand-made wordmark and emblem, never Ganjoor's logo image; footer and `/about` say it is an unofficial proposal and
that texts and data come from ganjoor.net (link), plus the creator credit.

## Stack

Vite + Preact + preact-iso (router, path routes, history mode) + vite-plugin-pwa (Workbox). Plain CSS with custom
properties (no Tailwind, no UI kit). Fonts: `public/fonts/Vazirmatn-{Regular,Bold}.ttf` (OFL, keep `OFL.txt`).
`<html lang="fa" dir="rtl">`. npm scripts: `dev`, `build`, `preview`, `test` (vitest).

## API

- Base `https://api.ganjoor.net/api`, CORS open (any Origin), paging totals in response header `paging-headers` (JSON).
- Semantic search: `POST https://ganjgah.ir/api/ganjoor/search/semantic` body `{query, topK, disableScopeDetection:false}`.
- Endpoint docs + real samples: `E:\claude-code-vibes\api-mcp\ganjoor\README.md`, `api_catalog.json`,
  `apis/<group>/<op>/{README.md,sample.json}`. Site/UX audit: `..\api-mcp\ganjoor\UI_AUDIT.md`.
- Audio mp3s on `i.ganjoor.net` support Range.

## Ownership

- Core build: everything except `src/explore/**`. Owns `src/api.js` (shared fetch helper), `src/app.jsx` (shell + router),
  styles, PWA config, `index.html`, `package.json`.
- Explore build: only `src/explore/**` (own `src/explore/api.js`, may import nothing from core except the CSS tokens
  documented in `src/styles/tokens.css` once it exists; until then use the token names below). Exception: internal
  links use `url()` from `src/lib/base.js` (the app may be served under a base path).

## Routes

Core: `/` home, `/poets`, `/poet/:id`, `/cat/:id`, `/poem/:id`, `/search` (`?q=`, `?mode=meaning|text`), `/faal`,
`/random`, `/bookmarks`, `/history`, `/settings`.
Explore (exported from `src/explore/index.js` as `routes = [{path, title, icon, nav, component}]`):
`/meters`, `/meters/:id` (similar poems by meter+rhyme), `/people`, `/people/:id` (relations + family tree),
`/museum`, `/museum/:slug`, `/places`, `/literary` (devices/tags), `/words/:catId`.

## Design tokens (CSS custom properties on :root, light + dark via [data-theme] and prefers-color-scheme)

`--bg --surface --text --text-muted --accent --accent-ink --border --radius --space-1..6 --font-body --font-size-poem`
