// "Get the app": the browser install prompt (Chromium only, captured as early as possible) and the Android APK link.
import { isNative } from './native.js'

export const APK_RELEASE_URL = 'https://github.com/sepehr071/ganjoor-pwa/releases/latest'
export const APK_URL = import.meta.env.VITE_APK_URL || `${APK_RELEASE_URL}/download/ganjoor.apk`

let deferred = null
const subs = new Set()
const emit = () => subs.forEach((f) => f())

/** Call before render: Chromium fires beforeinstallprompt once, early. Holding it replaces the mini-infobar with our button. */
export function initInstall() {
  if (isNative) return
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e
    emit()
  })
  addEventListener('appinstalled', () => {
    deferred = null
    emit()
  })
}

export const onInstallChange = (f) => (subs.add(f), () => subs.delete(f))
export const canPrompt = () => deferred !== null

/** Already running as an app: the Android build, or the installed PWA window. */
export const isInstalled = () =>
  isNative || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true

/** iOS (incl. iPadOS posing as a Mac) has no install prompt: users add it from the Share menu. */
export const isIOS = (ua = navigator.userAgent, touch = navigator.maxTouchPoints) =>
  /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && touch > 1)

/** Show the browser's install dialog; true when the user accepted. */
export async function promptInstall() {
  const e = deferred
  if (!e) return false
  deferred = null
  e.prompt()
  const { outcome } = await e.userChoice
  emit()
  return outcome === 'accepted'
}
