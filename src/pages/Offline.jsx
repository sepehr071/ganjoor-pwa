import { useEffect, useRef, useState } from 'preact/hooks'
import { url } from '../lib/base.js'
import { useAsync, useOnline, useTitle } from '../lib/hooks.js'
import { downloadOfflinePack, installedPacks, offlineManifest, removeOfflinePack } from '../lib/offlineLibrary.js'
import { normalize, toFaDigits } from '../lib/poem.js'
import { Icon } from '../components/Icon.jsx'
import { Empty, Loading } from '../components/Status.jsx'

const formatNumber = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 })
const sizeLabel = (bytes) => bytes >= 1024 ** 2
  ? `${formatNumber.format(bytes / 1024 ** 2)} مگابایت`
  : `${formatNumber.format(Math.ceil(bytes / 1024))} کیلوبایت`

export default function Offline() {
  useTitle('کتابخانهٔ آفلاین')
  const online = useOnline()
  const { data, error, loading, retry } = useAsync((signal) => online ? offlineManifest(signal) : Promise.resolve(null), [online])
  const catalog = online ? data : null
  const [installed, setInstalled] = useState([])
  const [query, setQuery] = useState('')
  const [job, setJob] = useState(null)
  const [notice, setNotice] = useState('')
  const [failed, setFailed] = useState(false)
  const active = useRef(null)

  useEffect(() => {
    let mounted = true
    installedPacks().then((packs) => {
      if (mounted) setInstalled(packs)
    }).catch(() => {
      if (mounted) {
        setFailed(true)
        setNotice('حافظهٔ آفلاین در این مرورگر در دسترس نیست.')
      }
    })
    return () => {
      mounted = false
      active.current?.abort()
    }
  }, [])

  const byId = new Map(installed.map((p) => [p.id, p]))
  const availablePacks = new Set(catalog?.packs.map((p) => p.id))
  const packs = [...(catalog?.packs || []), ...installed.filter((p) => !availablePacks.has(p.id))]
  const remaining = (catalog?.packs || []).filter((p) => byId.get(p.id)?.version !== catalog.version)
  const totalBytes = (entries) => entries.reduce((sum, p) => sum + p.bytes, 0)
  const visible = packs.filter((p) => normalize(p.name).includes(normalize(query)))

  async function download(entries) {
    if (active.current || !entries.length) return
    const controller = new AbortController()
    active.current = controller
    setNotice('')
    setFailed(false)
    navigator.storage?.persist?.().catch(() => {})
    const total = totalBytes(entries)
    let completed = 0
    try {
      for (const entry of entries) {
        setJob({ name: entry.name, received: completed, total })
        await downloadOfflinePack(catalog, entry, {
          signal: controller.signal,
          onProgress: (received) => setJob({ name: entry.name, received: completed + received, total }),
        })
        completed += entry.bytes
        setInstalled(await installedPacks())
        if (controller.signal.aborted) break
      }
      setNotice(controller.signal.aborted ? 'دریافت متوقف شد.' : 'شعرها برای خواندن آفلاین آماده\u200cاند.')
    } catch (downloadError) {
      setFailed(!controller.signal.aborted)
      setNotice(controller.signal.aborted ? 'دریافت متوقف شد.' : downloadError.name === 'QuotaExceededError'
        ? 'فضای کافی برای ذخیرهٔ شعرها نیست.' : 'دریافت کامل نشد. دوباره امتحان کنید.')
    } finally {
      active.current = null
      setJob(null)
    }
  }

  async function remove(pack) {
    if (active.current) return
    const controller = new AbortController()
    active.current = controller
    setJob({ name: pack.name })
    setNotice('')
    setFailed(false)
    try {
      await removeOfflinePack(pack.id)
      setInstalled(await installedPacks())
      setNotice(`آثار ${pack.name} از کتابخانهٔ آفلاین برداشته شد.`)
    } catch {
      setFailed(true)
      setNotice('حذف انجام نشد. دوباره امتحان کنید.')
    } finally {
      active.current = null
      setJob(null)
    }
  }

  return (
    <div class="stack-lg">
      <header class="page-head">
        <h1 class="display">کتابخانهٔ آفلاین</h1>
        <p>متن شعرها را یک بار بگیرید و بعد بدون اینترنت بخوانید یا در آن{'\u200c'}ها جستجو کنید.</p>
      </header>
      {remaining.length > 0 && (
        <div class="row">
          <button type="button" class="btn primary" disabled={!!job} onClick={() => download(remaining)}>
            <Icon name="offline" size={18} /> دریافت همه ({sizeLabel(totalBytes(remaining))})
          </button>
        </div>
      )}
      {job?.total && (
        <div class="card stack" aria-label="پیشرفت دریافت" role="group">
          <p role="status">در حال دریافت آثار {job.name}</p>
          <progress aria-label={'حجم دریافت\u200cشده'} value={job.received} max={job.total} />
          <span class="small muted">{sizeLabel(job.received)} از {sizeLabel(job.total)}</span>
          <div><button type="button" class="btn" onClick={() => active.current?.abort()}>توقف دریافت</button></div>
        </div>
      )}
      {notice && <p role={failed ? 'alert' : 'status'}>{notice}</p>}
      {error && (
        <div class="status error" role="alert">
          <p>فهرست دانلود در دسترس نیست. اتصال اینترنت را بررسی کنید.</p>
          <button type="button" class="btn" onClick={retry}>تلاش دوباره</button>
        </div>
      )}
      {loading && !installed.length && <Loading label="در حال بارگیری کتابخانهٔ آفلاین" />}
      {!online && !loading && packs.length === 0 && (
        <Empty>{'هنوز مجموعه\u200cای نگرفته\u200cاید. برای دریافت شعرها به اینترنت وصل شوید.'}</Empty>
      )}
      {packs.length > 0 && (
        <>
          <label class="search-pill">
            <Icon name="search" size={20} />
            <span class="sr-only">جستجوی نام شاعر</span>
            <input type="search" placeholder="نام شاعر…" value={query} onInput={(event) => setQuery(event.currentTarget.value)} />
          </label>
          {visible.length === 0 && <Empty>شاعری با این نام پیدا نشد.</Empty>}
          <ul class="list">
            {visible.map((p) => {
              const have = byId.get(p.id)
              const canDownload = availablePacks.has(p.id) && have?.version !== catalog.version
              return (
                <li key={p.id} class="list-link">
                  <div class="list-main">
                    <div class="list-title">{have ? <a href={url(`/poet/${p.id}`)}>{p.name}</a> : p.name}</div>
                    <span class="list-sub">{toFaDigits(p.poems)} شعر · {sizeLabel(p.bytes)}</span>
                  </div>
                  {canDownload && (
                    <button type="button" class="btn" aria-label={`دریافت آثار ${p.name}`} disabled={!!job} onClick={() => download([p])}>
                      {have ? 'به\u200cروزرسانی' : 'دریافت'}
                    </button>
                  )}
                  {have && (
                    <button type="button" class="btn link" aria-label={`حذف آثار ${p.name} از آفلاین`} disabled={!!job} onClick={() => remove(p)}>
                      حذف
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
      <p class="credit">
        متن شعرها از <a href="https://ganjoor.net">گنجور</a>، حاصل کار حمیدرضا محمدی و همکاران گنجور است.
        نسخهٔ آفلاین بر پایهٔ <a href="https://github.com/sajad2025/ganjoor/releases/tag/v2026.1">بایگانی گنجور</a> با
        مجوز <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> آماده شده است.
      </p>
    </div>
  )
}
