import { useEffect, useState, useCallback } from 'preact/hooks'
import { isNative, nativeShare } from './native.js'

/** Run an async loader when deps change. Returns {data, error, loading, retry}. The loader gets an AbortSignal. */
export function useAsync(load, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const ctrl = new AbortController()
    setState((s) => ({ data: s.data, error: null, loading: true }))
    load(ctrl.signal)
      .then((data) => !ctrl.signal.aborted && setState({ data, error: null, loading: false }))
      .catch((error) => !ctrl.signal.aborted && setState({ data: null, error, loading: false }))
    return () => ctrl.abort()
  }, [...deps, tick])
  const retry = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, retry }
}

export function useOnline() {
  const [on, setOn] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const up = () => setOn(true)
    const down = () => setOn(false)
    addEventListener('online', up)
    addEventListener('offline', down)
    return () => {
      removeEventListener('online', up)
      removeEventListener('offline', down)
    }
  }, [])
  return on
}

export const SITE_NAME = 'گنجور — نسخهٔ پیشنهادی'

/** "<page> | گنجور (پیشنهادی)"; the home page (no title) gets the full name. */
export const pageTitle = (title) => (title ? `${title} | گنجور (پیشنهادی)` : SITE_NAME)

export function useTitle(title) {
  useEffect(() => {
    document.title = pageTitle(title)
  }, [title])
}

let toastTimer
let toastSet
export function toast(msg) {
  toastSet?.(msg)
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toastSet?.(''), 2400)
}
export function useToastHost() {
  const [msg, setMsg] = useState('')
  useEffect(() => {
    toastSet = setMsg
    return () => (toastSet = null)
  }, [])
  return msg
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    toast('رونوشت شد')
  } catch {
    toast('رونوشت ممکن نشد')
  }
}

export async function share({ title, text, url }) {
  if (isNative) return nativeShare({ title, text, url })
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
    } catch {}
    return
  }
  await copyText(url)
}
