// Android (Capacitor) glue. Everything here is a no-op on the web build.
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Share } from '@capacitor/share'
import { StatusBar, Style } from '@capacitor/status-bar'

export const isNative = Capacitor.isNativePlatform()

export function listenWidgetLinks(route) {
  if (!isNative) return
  let active = true
  const listener = App.addListener('appUrlOpen', ({ url }) => {
    const match = /^beyt:\/\/poem\/([1-9]\d*)$/.exec(url)
    if (active && match) route(`/poem/${match[1]}`)
  })
  return () => {
    active = false
    listener.then((handle) => handle.remove())
  }
}

/** WebView has no Web Share. A https://localhost link is useless to others, so it is dropped (the text carries the ganjoor.net source). */
export async function nativeShare({ title, text, url }) {
  try {
    await Share.share({ title, text, url: url?.startsWith(location.origin) ? undefined : url })
  } catch {}
}

export function initNative() {
  if (!isNative) return

  // Back: history back, exit on home.
  App.addListener('backButton', ({ canGoBack }) => {
    if (location.pathname !== '/' && canGoBack) history.back()
    else App.exitApp()
  })

  // External links open in the system browser (Custom Tab), never in the app WebView.
  addEventListener(
    'click',
    (e) => {
      const a = e.target.closest?.('a[href]')
      if (!a || a.origin === location.origin || !/^https?:$/.test(a.protocol)) return
      e.preventDefault()
      Browser.open({ url: a.href })
    },
    true,
  )

  // Status bar follows the theme: tokens.css sets color-scheme and --bg per theme.
  const root = document.documentElement
  const syncBar = () => {
    const css = getComputedStyle(root)
    StatusBar.setStyle({ style: css.colorScheme === 'dark' ? Style.Dark : Style.Light }).catch(() => {})
    // No effect on Android 15+ (edge-to-edge): there the page paints behind the bar.
    StatusBar.setBackgroundColor({ color: css.getPropertyValue('--bg').trim() }).catch(() => {})
  }
  new MutationObserver(syncBar).observe(root, { attributes: true, attributeFilter: ['data-theme'] })
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncBar)
  syncBar()
}
