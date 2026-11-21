# بیت (Beyt)

Live: https://sepehr071.github.io/ganjoor-pwa/ · Android APK: [latest release](https://github.com/sepehr071/ganjoor-pwa/releases/latest)

«بیت» is an independent, unofficial, installable and offline-capable reader for classical Persian poetry, built on the
open data and public API of [Ganjoor (ganjoor.net)](https://ganjoor.net). It is not made, endorsed or supported by
Ganjoor. All poems, meanings, recitations and scans come from Ganjoor and its contributors. For questions, bugs or
support, contact the developer (links below), not Ganjoor. `/about` in the app shows how it reads Ganjoor's data
compared with the site (numbers from `../api-mcp/ganjoor/UI_AUDIT.md`).

Until v0.2.0 the app was called «گنجور — نسخهٔ پیشنهادی». It was renamed in v0.3.0 because
[Ganjoor's FAQ](https://ganjoor.net/faq) asks third-party apps to use a name of their own. The repo name and the Android
package id `io.github.sepehr071.ganjoor` stay as they were so links and installs keep working.

Designed and built by Sepehr Radmard ([GitHub](https://github.com/sepehr071),
[LinkedIn](https://www.linkedin.com/in/sepehr-radmard)).

Features: poets, books and a calm poem reader (tap a couplet for its meaning), optional Nastaliq poem text, one audio
player with reciter choice, speed and verse highlighting, text and meaning search, Hafez faal, bookmarks and history on
the device, offline reading, light/dark theme, adjustable size; explore meters, people and family trees, manuscript
museum, places, literary devices and word frequency. No trackers.

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm test           # vitest
npm run build && npm run preview -- --host 127.0.0.1
```

GitHub Pages: `.github/workflows/pages.yml` builds on every push to `main` with `BASE_PATH=/ganjoor-pwa/` (Vite `base`) and
copies `index.html` to `404.html` so deep links load. App code keeps root paths; internal links go through `url()` from
`src/lib/base.js`, and the router sees paths with the base stripped.

Stack: Vite, Preact, preact-iso, vite-plugin-pwa (Workbox). Contract between the core app and the explore section:
`CONTRACT.md`. Icons: `node scripts/make-icons.mjs`.

Look: "modern Persian manuscript". Ivory paper and lapis ink (lapis night in dark mode), turquoise for actions, gold
leaf for rules and ornament only, cinnabar for small highlights. Ornaments (girih band, rosette, sarlowh, shamseh,
mihrab arch) are inline SVG or SVG masks in `src/styles/tokens.css` and `src/components/Ornament.jsx`.

Fonts (all OFL, self-hosted, no CDN): Vazirmatn for the UI (`public/fonts/OFL.txt`); Noto Nastaliq Urdu
(`@fontsource/noto-nastaliq-urdu`) for the optional Nastaliq poem text, lazy-loaded when chosen in settings; the
wordmark «بیت» uses a 3 KB subset of the same font, made with fontTools:

```bash
python -m fontTools.subset node_modules/@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-arabic-700-normal.woff2 \
  --text="بیت" --layout-features='*' --flavor=woff2 --output-file=public/fonts/beyt-mark.woff2
```

Known limits: audio is not cached offline (i.ganjoor.net mp3s send no CORS headers); very large family trees render
tall; literary-device data covers mostly Hafez so far; Noto Nastaliq is an Urdu-style Nastaliq, so a word-initial
Persian ه takes the Urdu shape.
