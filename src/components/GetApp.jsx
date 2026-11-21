import { useEffect, useState } from 'preact/hooks'
import { Icon } from './Icon.jsx'
import { APK_URL, canPrompt, isInstalled, isIOS, onInstallChange, promptInstall } from '../lib/install.js'

const T = {
  title: 'گنجور را نصب کنید',
  lead: 'بی\u200cنیاز از مرورگر، با شعرهای خوانده\u200cشده در حالت آفلاین.',
  install: 'افزودن به دستگاه',
  ios: 'افزودن به صفحهٔ اصلی',
  apk: 'دانلود برای اندروید',
  apkNote: 'فایل APK · اندروید ۷ به بالا · نسخهٔ ۰.۲',
  hint: 'برای نصب نسخهٔ وب، در منوی مرورگر گزینهٔ «نصب برنامه» یا «افزودن به صفحهٔ اصلی» را بزنید.',
  iosSteps: ['در Safari دکمهٔ «هم\u200cرسانی» (مربع با فلش رو به بالا) را بزنید.', 'گزینهٔ «Add to Home Screen» یا «افزودن به صفحهٔ اصلی» را انتخاب کنید.', 'دکمهٔ «Add» را بزنید.'],
}

/** Install the web app (browser prompt, or iOS steps) or download the Android APK. Hidden inside an installed app. */
export function GetApp({ id = 'get-app' }) {
  const [, rerender] = useState(0)
  const [steps, setSteps] = useState(false)
  useEffect(() => onInstallChange(() => rerender((n) => n + 1)), [])
  if (isInstalled()) return null

  const prompt = canPrompt()
  const ios = !prompt && isIOS()
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
        {prompt && (
          <button type="button" class="btn primary" onClick={promptInstall}>
            <Icon name="plus" size={18} />{T.install}
          </button>
        )}
        {ios && (
          <button type="button" class="btn primary" aria-expanded={steps} onClick={() => setSteps(!steps)}>
            <Icon name="plus" size={18} />{T.ios}
          </button>
        )}
        <a class="btn gold" href={APK_URL} rel="noopener">
          <Icon name="offline" size={18} />{T.apk}
        </a>
      </div>
      <p class="muted small">{T.apkNote}</p>
      {ios && steps && (
        <ol class="get-app-steps">
          {T.iosSteps.map((s) => <li key={s}>{s}</li>)}
        </ol>
      )}
      {!prompt && !ios && <p class="muted small">{T.hint}</p>}
    </section>
  )
}
