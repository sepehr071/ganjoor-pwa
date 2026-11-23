import { useEffect, useRef, useState } from 'preact/hooks'
import { downloadRecitation } from '../lib/offlineAudio.js'
import { savedAudioDelete } from '../lib/store.js'
import { useOnline, toast } from '../lib/hooks.js'
import { Icon } from './Icon.jsx'
import { Sheet } from './Sheet.jsx'

export function OfflineRecitations({ open, onClose, poem, recs, saved, onChange, onPlay }) {
  const online = useOnline()
  const [busy, setBusy] = useState(null)
  const request = useRef(null)
  useEffect(() => () => request.current?.abort(), [])

  const change = async (rec, remove) => {
    const controller = new AbortController()
    request.current = controller
    setBusy(rec.id)
    try {
      if (remove) await savedAudioDelete(poem.id, rec.id)
      else await downloadRecitation(poem, rec, controller.signal)
      await onChange()
      toast(remove ? 'خوانش از دستگاه پاک شد' : 'شعر و خوانش برای آفلاین ذخیره شدند')
    } catch (error) {
      if (!controller.signal.aborted) {
        toast(error.name === 'QuotaExceededError' ? 'فضای کافی برای ذخیرهٔ خوانش نیست' : 'خوانش ذخیره یا پاک نشد. دوباره تلاش کنید.')
      }
    } finally {
      request.current = null
      setBusy(null)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} label="خوانش آفلاین">
      <h2 class="sheet-title">خوانش آفلاین</h2>
      <ul class="sheet-list">
        {recs.map((rec, index) => {
          const stored = saved.includes(rec.id)
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
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}
