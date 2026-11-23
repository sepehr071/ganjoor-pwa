# بیت (Beyt)

**[دانلود مستقیم بیت برای اندروید](https://github.com/sepehr071/ganjoor-pwa/releases/latest/download/ganjoor.apk)**

برای اندروید ۷ و بالاتر. پس از دانلود، فایل `ganjoor.apk` را باز کنید و «نصب» را بزنید.

[باز کردن نسخهٔ وب](https://sepehr071.github.io/ganjoor-pwa/)

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
the device, offline reading and downloadable recitations, light/dark theme, adjustable size; explore meters, people and family trees, manuscript
museum, places, literary devices and word frequency. No trackers.

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm test           # vitest
npm run build && npm run preview -- --host 127.0.0.1
```

GitHub Pages: `.github/workflows/pages.yml` builds on every push to `main` with `BASE_PATH=/ganjoor-pwa/` (Vite `base`) and
copies `index.html` to `404.html` for existing deep links. New shared links open through the entry page with HTTP 200.
App code keeps root paths. Internal links go through `url()` from
`src/lib/base.js`, and the router sees paths with the base stripped.

Stack: Vite, Preact, preact-iso, vite-plugin-pwa (Workbox). Contract between the core app and the explore section:
`CONTRACT.md`. The PWA uses `public/icons/beyt-*.png` and the home illustration in `public/art/`.

Look: "modern Persian manuscript". Ivory paper and lapis ink (lapis night in dark mode), turquoise for actions, gold
leaf for rules and ornament only, cinnabar for small highlights. Ornaments (girih band, rosette, sarlowh, shamseh,
mihrab arch) are inline SVG or SVG masks in `src/styles/tokens.css` and `src/components/Ornament.jsx`.

The poem reader defaults to Vazirmatn (وزیرمتن), 23 px, with 1.7 line spacing. Settings also offers Parastoo (پرستو), Markazi Text (مرکزی), Estedad (استعداد), Mikhak (میخک), and Nastaliq (نستعلیق). The fonts are bundled for offline reading.

Fonts (all OFL, self-hosted, no CDN): Vazirmatn for the UI (`public/fonts/OFL.txt`); Noto Nastaliq Urdu
(`@fontsource/noto-nastaliq-urdu`) for titles and optional Nastaliq poem text, cached for offline use; the
wordmark «بیت» uses a 3 KB subset of the same font, made with fontTools:

```bash
python -m fontTools.subset node_modules/@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-arabic-700-normal.woff2 \
  --text="بیت" --layout-features='*' --flavor=woff2 --output-file=public/fonts/beyt-mark.woff2
```

To download a recitation and its poem, open **خوانش آفلاین** on the poem page and select **دریافت** beside a reciter.
Saved poems and recitations are available from the bookmarks page. Removing a saved poem also removes its recitations.

Open **کتابخانهٔ آفلاین** from Settings or the Explore menu to download one poet or the full text catalog. Once downloaded,
poets, books, poems and text search work offline. The Hafez pack also enables offline faal. Pack sizes show the download
size. Recitations are downloaded individually from the reader.

For a web or staging build with downloads, extract the pinned [Ganjoor v2026.1 corpus](https://github.com/sajad2025/ganjoor/releases/tag/v2026.1)
after checking the archive against `SHA256SUMS`. Run `npm run build`, then run
`node scripts/make-offline-packs.mjs <extracted-root> dist/offline-packs`. Serve that directory alongside the web build.
The GitHub Pages workflow verifies the pinned archive and generates these packs after the web build.
For an Android staging build, set `VITE_OFFLINE_CATALOG_URL` to the staging HTTPS manifest URL before the web build.

The daily verse collection uses classical Persian poetry from Ganjoor (Hamid Reza Mohammadi and contributors),
republished under CC BY 4.0 via the same corpus snapshot. Regenerate it with
`node scripts/make-daily-poems.mjs <extracted-root>`.

## Faal and digital signage

An integration can read Ganjoor's public endpoints without an API key. Fetch a new result on each intentional refresh.

```js
const base = 'https://api.ganjoor.net/api/ganjoor'
const response = await fetch(`${base}/hafez/faal`)
if (!response.ok) throw new Error(`Ganjoor returned ${response.status}`)
const poem = await response.json()
const text = poem.verses?.length ? poem.verses.map((verse) => verse.text).join('\n') : poem.plainText
const credit = { label: 'گنجور', url: `https://ganjoor.net${poem.fullUrl}` }
```

For a random poem, use `/poem/random?poetId=0`, or substitute a specific poet ID. Display `fullTitle`, the verse text,
and the Ganjoor source link together. When presenting a rotating sign, keep the previous poem visible if a refresh fails.

Known limits: very large family trees render
tall; literary-device data covers mostly Hafez so far; Noto Nastaliq is an Urdu-style Nastaliq, so a word-initial
Persian ه takes the Urdu shape.
