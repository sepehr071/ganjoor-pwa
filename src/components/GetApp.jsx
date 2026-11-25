import { useEffect, useState } from 'preact/hooks'
import { Icon } from './Icon.jsx'
import { APK_URL, canPrompt, isInstalled, isIOS, onInstallChange, promptInstall } from '../lib/install.js'

const T = {
  title: 'بیت را نصب کنید',
  lead: 'بیت را از صفحهٔ اصلی دستگاه باز کنید و شعرهای ذخیره\u200cشده را آفلاین بخوانید.',
  install: 'افزودن به دستگاه',
  ios: 'راهنمای نصب در آیفون و آیپد',
  apk: 'دانلود برای اندروید',
  apkNote: 'فایل APK برای اندروید ۷ به بالا',
  apkStorage: 'نشان\u200cها، سابقهٔ خواندن، تنظیمات و دانلودهای آفلاین در نسخهٔ وب و برنامهٔ اندروید جداگانه ذخیره می\u200cشوند.',
  hint: 'برای نصب نسخهٔ وب، در منوی مرورگر گزینهٔ «نصب برنامه» یا «افزودن به صفحهٔ اصلی» را بزنید.',
  iosSteps: [
    'این صفحه را در Safari باز کنید و «هم\u200cرسانی» (مربع با فلش رو به بالا) را بزنید.',
    'گزینهٔ «Add to Home Screen» را انتخاب کنید. اگر آن را نمی\u200cبینید، «View More» یا «Edit Actions» را بزنید.',
    'اگر گزینهٔ «Open as Web App» را دیدید، آن را روشن کنید. سپس «Add» را بزنید.',
  ],
}

/** Install the web app (browser prompt, or iOS steps) or download the Android APK. Hidden inside an installed app. */
export function GetApp({ id = 'get-app' }) {
  const [, rerender] = useState(0)
  const [steps, setSteps] = useState(false)
  useEffect(() => onInstallChange(() => rerender((n) => n + 1)), [])
  if (isInstalled()) return null

  const prompt = canPrompt()
  const ios = isIOS()
  return (
    <section class="card get-app" aria-labelledby={id}>
      <div class="get-app-head">
        <span class="get-app-icon" aria-hidden="true"><Icon name="phone" size={22} /></span>
        <div>
          <h2 id={id}>{T.title}</h2>
          <p class="muted small">{T.lead}</p>
        </div>
      </div>
      <div class="get-app-actions">
        {prompt && !ios && (
          <button type="button" class="btn primary" onClick={promptInstall}>
            <Icon name="plus" size={18} />{T.install}
          </button>
        )}
        {ios && (
          <button type="button" class="btn primary" aria-expanded={steps} onClick={() => setSteps(!steps)}>
            <Icon name="plus" size={18} />{T.ios}
          </button>
        )}
        {!ios && <a class="btn gold" href={APK_URL} rel="noopener">
          <Icon name="offline" size={18} />{T.apk}
        </a>}
      </div>
      {!ios && <p class="muted small">
        {T.apkNote} · در <a href={APK_URL.replace('/download/ganjoor.apk', '')}>{'صفحهٔ انتشار گیت\u200cهاب'}</a>، از بخش <bdi>Assets</bdi> فایل <bdi>ganjoor.apk</bdi> را بگیرید.
      </p>}
      {!ios && <p class="muted small">{T.apkStorage}</p>}
      {ios && steps && (
        <ol class="get-app-steps">
          {T.iosSteps.map((s) => <li key={s}>{s}</li>)}
        </ol>
      )}
      {!prompt && !ios && <p class="muted small">{T.hint}</p>}
    </section>
  )
}
