import { useTitle } from '../lib/hooks.js'
import { url } from '../lib/base.js'
import { useStored, SETTINGS, DEFAULT_SETTINGS } from '../lib/store.js'
import { toFaDigits } from '../lib/poem.js'
import { GetApp } from '../components/GetApp.jsx'

const THEMES = [
  ['system', 'مطابق دستگاه'],
  ['light', 'روشن'],
  ['dark', 'تیره'],
]
const FONTS = [
  ['sans', 'وزیرمتن'],
  ['parastoo', 'پرستو'],
  ['markazi', 'مرکزی'],
  ['estedad', 'استعداد'],
  ['mikhak', 'میخک'],
  ['nastaliq', 'نستعلیق'],
]

export default function Settings() {
  useTitle('تنظیمات')
  const [stored, setStored] = useStored(SETTINGS, DEFAULT_SETTINGS)
  const s = { ...DEFAULT_SETTINGS, ...stored }
  const set = (patch) => setStored({ ...s, ...patch })

  return (
    <div class="stack-lg">
      <div class="page-head"><h1 class="display">تنظیمات</h1></div>

      <p><a class="btn" href={url('/offline')}>کتابخانهٔ آفلاین</a></p>

      <section class="stack" aria-labelledby="th">
        <h2 id="th">پوسته</h2>
        <div class="radio-row" role="group" aria-labelledby="th">
          {THEMES.map(([v, l]) => (
            <button type="button" key={v} class="btn" aria-pressed={s.theme === v} onClick={() => set({ theme: v })}>{l}</button>
          ))}
        </div>
      </section>

      <section class="stack" aria-labelledby="rd">
        <h2 id="rd">خواندن</h2>
        <div class="stack">
          <p id="pf">خط شعر</p>
          <div class="font-options" role="group" aria-labelledby="pf">
            {FONTS.map(([v, l]) => (
              <button type="button" class="btn" key={v} aria-pressed={s.poemFont === v} onClick={() => set({ poemFont: v })}>
                {l}
                {v === DEFAULT_SETTINGS.poemFont && <small>{'پیش\u200cفرض'}</small>}
              </button>
            ))}
          </div>
          <p class="muted small">{'عنوان\u200cها همیشه نستعلیق\u200cاند؛ این گزینه خط متن شعر را تعیین می\u200cکند.'}</p>
        </div>
        <div class="range-row">
          <label for="fs">اندازهٔ شعر: {toFaDigits(s.fontSize)}</label>
          <input id="fs" type="range" min="16" max="36" step="1" value={s.fontSize} onInput={(e) => set({ fontSize: Number(e.currentTarget.value) })} />
        </div>
        <div class="range-row">
          <label for="lh">فاصلهٔ خطوط: {toFaDigits(s.lineHeight.toFixed(1))}</label>
          <input id="lh" type="range" min="1.6" max="2.8" step="0.1" value={s.lineHeight} onInput={(e) => set({ lineHeight: Number(e.currentTarget.value) })} />
        </div>
        <div class="folio preview" aria-label={"پیش\u200cنمایش"}>
          <p class="beyt" style="pointer-events:none">
            <span class="m">بنی{'\u200c'}آدم اعضای یکدیگرند</span>
            <span class="sep" aria-hidden="true" />
            <span class="m">که در آفرینش ز یک گوهرند</span>
          </p>
        </div>
      </section>

      <section class="stack" aria-labelledby="ab">
        <h2 id="ab">دربارهٔ بیت</h2>
        <p>
          {'بیت برنامه\u200cای مستقل و غیررسمی است. همهٔ متن\u200cها، معنی\u200cها و خوانش\u200cها از داده\u200cهای باز '}
          <a href="https://ganjoor.net" target="_blank" rel="noopener noreferrer">گنجور</a>
          {' می\u200cآید و حق آن\u200cها با صاحبانشان است. این برنامه را گنجور نساخته است؛ برای پشتیبانی با سازندهٔ بیت تماس بگیرید، نه با گنجور. هیچ ردیاب یا آمارگیری ندارد و نشان\u200cها، سابقه و تنظیمات فقط در همین دستگاه می\u200cماند.'}
        </p>
        <p><a href={url('/about')}>{'بیشتر دربارهٔ بیت'}</a></p>
      </section>

      <GetApp id="get-app-settings" />
    </div>
  )
}
