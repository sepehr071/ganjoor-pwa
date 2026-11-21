import { useTitle } from '../lib/hooks.js'
import { Sarlowh } from '../components/Ornament.jsx'

const EXT = { target: '_blank', rel: 'noopener noreferrer' }

// Left column: ganjoor.net audit (UI_AUDIT.md, /hafez/ghazal/sh1, phone 390x844). Right column: this app, same poem
// (/poem/2130), measured with Chrome DevTools on the production build.
const ROWS = [
  ['حجم صفحهٔ یک غزل', '۱٫۰۵ مگابایت HTML (۳۰۲ کیلوبایت فشرده)', '۴۶ کیلوبایت JSON برای شعر؛ خود برنامه حدود ۳۰ کیلوبایت فشرده و فقط یک بار'],
  ['گره\u200cهای DOM صفحهٔ شعر', '۹٬۲۵۴', '۱۸۴'],
  ['نصب و خواندن آفلاین', 'ندارد (manifest و service worker پیدا نمی\u200cشوند)', 'نصب\u200cشدنی؛ شعرهای خوانده\u200cشده آفلاین باز می\u200cشوند'],
  ['پخش خوانش\u200cها', '۱۸ پخش\u200cکنندهٔ جدا برای یک غزل', 'یک پخش\u200cکننده با انتخاب خواننده، سرعت و دنبال\u200cکردن بیت'],
  ['دسترس\u200cپذیری (Lighthouse)', '۷۹ از ۱۰۰', '۱۰۰ از ۱۰۰'],
  ['جای نخستین بیت روی گوشی', 'حدود ۶۲۰ پیکسل پایین\u200cتر از بالای صفحه', 'حدود ۳۹۰ پیکسل'],
  ['ردیاب و آمارگیر', 'دارد (kntr.ir)', 'ندارد'],
]

const FEATURES = [
  'خواندن آرام: بیت\u200cها دو ستونه، اندازه و فاصلهٔ خط قابل تنظیم و خط نستعلیق اختیاری',
  'معنی هر بیت با یک ضربه روی همان بیت',
  'یک پخش\u200cکننده برای همهٔ خوانش\u200cها، با سرعت، انتخاب خواننده و رفتن به شعر بعدی',
  'جستجو در متن و جستجو بر پایهٔ معنا',
  'فال حافظ، شعر تصادفی و بیت امروز',
  'نشان\u200cها و سابقهٔ خواندن روی همین دستگاه، بدون ثبت\u200cنام',
  'نصب روی صفحهٔ اصلی گوشی و خواندن آفلاین',
  'کاوش در وزن\u200cها، شخصیت\u200cها، موزه، مکان\u200cها و آرایه\u200cها',
  'پوستهٔ روشن و تیره، و کار با صفحه\u200cخوان و صفحه\u200cکلید',
]

export default function About() {
  useTitle('درباره این طرح')
  return (
    <div class="stack-lg">
      <header class="folio-head">
        <Sarlowh />
        <h1>درباره این طرح</h1>
        <p class="muted" style="max-width:38rem">
          {'این یک نسخهٔ پیشنهادی و غیررسمی PWA برای گنجور است: همان شعرها و داده\u200cهای گنجور، در یک برنامهٔ وب نصب\u200cشدنی که سبک\u200cتر است، آفلاین کار می\u200cکند و روی گوشی راحت\u200cتر خوانده می\u200cشود.'}
        </p>
      </header>

      <section class="stack" aria-labelledby="cmp">
        <h2 id="cmp">{'چه چیزی بهتر می\u200cشود'}</h2>
        <div class="compare-wrap">
          <table class="compare">
            <thead>
              <tr><th scope="col">سنجه</th><th scope="col">گنجور امروز</th><th scope="col">این طرح</th></tr>
            </thead>
            <tbody>
              {ROWS.map(([k, a, b]) => (
                <tr key={k}><th scope="row">{k}</th><td data-label="گنجور امروز">{a}</td><td data-label="این طرح">{b}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p class="muted small">
          {'اعداد گنجور از بررسی غزل نخست حافظ (ganjoor.net/hafez/ghazal/sh1) در نمای گوشی ۳۹۰ در ۸۴۴ پیکسل است؛ اعداد این طرح از همان غزل در همین برنامه.'}
        </p>
      </section>

      <section class="stack" aria-labelledby="ft">
        <h2 id="ft">{'آنچه این نسخه دارد'}</h2>
        <ul class="features">
          {FEATURES.map((f) => (
            <li key={f}><span class="rosette" aria-hidden="true" />{f}</li>
          ))}
        </ul>
      </section>

      <section class="stack" aria-labelledby="src">
        <h2 id="src">{'متن\u200cها و داده\u200cها'}</h2>
        <p>
          {'همهٔ شعرها، معنی\u200cها، خوانش\u200cها و تصویرها از '}
          <a href="https://ganjoor.net" {...EXT}>گنجور (ganjoor.net)</a>
          {' و API عمومی آن می\u200cآید و حق آن\u200cها با گنجور و همکارانش است. این طرح را گنجور نساخته و تأیید نکرده است؛ پیشنهادی است برای نسخهٔ موبایل و آفلاین آن.'}
        </p>
      </section>

      <section class="folio signature" aria-labelledby="by">
        <h2 id="by" class="who">طراحی و ساخت: سپهر رادمرد</h2>
        <p lang="en" dir="ltr" class="muted">Designed and built by Sepehr Radmard</p>
        <p class="row" style="justify-content:center">
          <a class="btn" href="https://github.com/sepehr071" {...EXT}>GitHub</a>
          <a class="btn" href="https://www.linkedin.com/in/sepehr-radmard" {...EXT}>LinkedIn</a>
        </p>
      </section>
    </div>
  )
}
