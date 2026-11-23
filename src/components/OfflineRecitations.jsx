import { useEffect, useRef, useState } from 'preact/hooks'
import { downloadRecitation } from '../lib/offlineAudio.js'
import { savedAudioDelete } from '../lib/store.js'
import { useOnline, toast } from '../lib/hooks.js'
import { toFaDigits } from '../lib/poem.js'
import { Icon } from './Icon.jsx'
import { Sheet } from './Sheet.jsx'

export function OfflineRecitations({ open, onClose, poem, recs, saved, onChange, onPlay }) {
  const online = useOnline()
  const [busy, setBusy] = useState(null)
  const [progress, setProgress] = useState(null)
  const request = useRef(null)
  useEffect(() => () => request.current?.abort(), [])

  const change = async (rec, remove) => {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setBusy(rec.id)
    setProgress(remove ? null : { received: 0, total: null })
    try {
      if (remove) await savedAudioDelete(poem.id, rec.id)
      else await downloadRecitation(poem, rec, controller.signal, (received, total) => setProgress({ received, total }))
      await onChange()
      toast(remove ? 'خوانش از دستگاه پاک شد' : 'شعر و خوانش برای آفلاین ذخیره شدند')
    } catch (error) {
      if (!controller.signal.aborted) {
        toast(error.name === 'QuotaExceededError' ? 'فضای کافی برای ذخیرهٔ خوانش نیست' : 'خوانش ذخیره یا پاک نشد. دوباره تلاش کنید.')
      }
    } finally {
      request.current = null
      setBusy(null)
      setProgress(null)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} label="خوانش آفلاین">
      <h2 class="sheet-title">خوانش آفلاین</h2>
      <ul class="sheet-list">
        {recs.map((rec, index) => {
          const stored = saved.includes(rec.id)
          const download = busy === rec.id && progress
          const percent = download?.total ? Math.min(100, Math.floor(100 * download.received / download.total)) : null
          return (
            <li key={rec.id}>
              <div class="sheet-row">
                <span class="list-main">{rec.audioArtist}</span>
                {stored && (
                  <button type="button" class="btn link" onClick={() => onPlay(index)} aria-label={`پخش آفلاین ${rec.audioArtist}`}>
                    <Icon name="play" size={18} />
                  </button>
                )}
                {busy === rec.id && !stored ? (
                  <button type="button" class="btn link" onClick={() => request.current?.abort()}>لغو دریافت</button>
                ) : (
                  <button type="button" class="btn link" disabled={busy !== null || (!stored && !online)}
                    onClick={() => change(rec, stored)} aria-label={`${stored ? 'پاک کردن' : 'دریافت'} خوانش ${rec.audioArtist}`}>
                    {stored ? 'پاک کردن' : 'دریافت'}
                  </button>
                )}
              </div>
              {download && (
                <div class="recitation-progress">
                  <span class="small muted">{percent === null ? 'در حال دریافت خوانش' : `${toFaDigits(percent)}٪ دریافت شد`}</span>
                  <progress aria-label={`پیشرفت دریافت خوانش ${rec.audioArtist}`} value={percent ?? undefined} max={100} />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}
