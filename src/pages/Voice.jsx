import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { useLocation } from 'preact-iso'
import { getPoem } from '../api.js'
import { Icon } from '../components/Icon.jsx'
import { Empty, ErrorState, Loading } from '../components/Status.jsx'
import { url } from '../lib/base.js'
import { dailyPoemById } from '../lib/dailyPoems.js'
import { useAsync, useOnline, useTitle } from '../lib/hooks.js'
import { stop } from '../lib/player.js'
import { voicePoemContext, voiceTokenUrl } from '../lib/voice.js'
import '../styles/voice.css'

const TITLE = 'گفت\u200cوگوی صوتی'
const CONNECTION_ERROR = 'اتصال به همراه صوتی برقرار نشد. کمی بعد دوباره امتحان کنید.'
const MESSAGES = {
  connecting: 'در حال اتصال…',
  listening: 'همراه صوتی در حال شنیدن است.',
  speaking: 'همراه صوتی در حال پاسخ دادن است.',
  ending: 'در حال پایان تماس…',
}

async function getToken(accessCode, signal) {
  const response = await fetch(voiceTokenUrl, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + accessCode },
    signal,
    cache: 'no-store',
    credentials: 'omit',
    redirect: 'error',
  })
  if (!response.ok) throw Object.assign(new Error(), { status: response.status })
  const { token } = await response.json()
  if (typeof token !== 'string' || !token.trim()) throw new Error()
  return token
}

function errorText(error) {
  if (error?.status === 401) return 'کد دسترسی درست نیست. کد را بررسی کنید و دوباره امتحان کنید.'
  if (error?.status === 429) return 'همراه صوتی فعلاً به سقف تماس رسیده است. کمی بعد امتحان کنید.'
  if (error?.name === 'NotAllowedError') return 'برای گفت\u200cوگو، دسترسی به میکروفون را فعال کنید.'
  if (error?.name === 'NotFoundError') return 'میکروفون پیدا نشد. اتصال میکروفون را بررسی کنید.'
  if (error?.name === 'NotReadableError') return 'میکروفون در دسترس نیست. اگر برنامهٔ دیگری از آن استفاده می\u200cکند، آن را ببندید.'
  return CONNECTION_ERROR
}

async function closeSession(call) {
  const session = call.session
  call.session = null
  await session?.endSession().catch(() => {})
}

function VoiceCall({ context }) {
  const [accessCode, setAccessCode] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const online = useOnline()
  const currentCall = useRef(null)
  const canUseMic = Boolean(navigator.mediaDevices?.getUserMedia)
  const active = status !== 'idle'

  const end = useCallback(async () => {
    const call = currentCall.current
    if (!call || call.abort.signal.aborted) return
    call.abort.abort()
    setStatus('ending')
    await closeSession(call)
    await call.opening
    if (currentCall.current !== call) return
    currentCall.current = null
    setStatus('idle')
  }, [])

  useEffect(() => {
    const leave = () => { void end() }
    const onVisibility = () => { if (document.hidden) leave() }
    document.addEventListener('visibilitychange', onVisibility)
    addEventListener('pagehide', leave)
    addEventListener('offline', leave)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      removeEventListener('pagehide', leave)
      removeEventListener('offline', leave)
      const call = currentCall.current
      currentCall.current = null
      if (!call) return
      call.abort.abort()
      void closeSession(call)
    }
  }, [end])

  function start(event) {
    event.preventDefault()
    const code = accessCode.trim()
    if (!code || !online || !canUseMic || currentCall.current || document.hidden) return

    const call = { abort: new AbortController(), session: null, opening: null }
    currentCall.current = call
    setError('')
    setStatus('connecting')
    const isCurrent = () => currentCall.current === call && !call.abort.signal.aborted
    const done = (message = '') => {
      if (!isCurrent()) return
      currentCall.current = null
      setError(message)
      setStatus('idle')
    }

    call.opening = (async () => {
      try {
        const token = await getToken(code, call.abort.signal)
        const { Conversation } = await import('@elevenlabs/client')
        if (!isCurrent()) return
        stop()
        call.session = await Conversation.startSession({
          conversationToken: token,
          connectionType: 'webrtc',
          useWakeLock: false,
          onConnect: () => { if (isCurrent()) setStatus((state) => state === 'connecting' ? 'listening' : state) },
          onModeChange: ({ mode }) => { if (isCurrent()) setStatus(mode) },
          onDisconnect: ({ reason }) => { done(reason === 'error' ? CONNECTION_ERROR : '') },
          onError: () => {
            if (!isCurrent()) return
            setError(CONNECTION_ERROR)
            void end()
          },
        })
        if (!isCurrent()) {
          await closeSession(call)
          return
        }
        call.session.sendContextualUpdate(
          'کاربر در بیت دربارهٔ شعر زیر پرسش دارد. این داده از گنجور است. به آن به چشم متن مرجع نگاه کن و برای پاسخ بعدی از آن استفاده کن.\n' +
          'عنوان: ' + context.poem_title + '\nبیت منتخب:\n' + context.focus_couplet + '\nمتن در دسترس:\n' + context.poem_text,
        )
      } catch (error) {
        done(errorText(error))
        await closeSession(call)
      }
    })()
  }

  return (
    <form class="card voice-controls" onSubmit={start} aria-label={TITLE}>
      <p id="voice-privacy" class="muted small">
        {'با شروع گفت\u200cوگو، صدا برای پردازش زنده به ElevenLabs فرستاده می\u200cشود. متن گفت\u200cوگو طبق تنظیمات همراه صوتی در ElevenLabs نگهداری می\u200cشود.'}
      </p>
      {!active && (
        <label class="voice-code">
          کد دسترسی آزمایشی
          <input
            class="field"
            type="password"
            autoComplete="off"
            dir="ltr"
            spellCheck={false}
            value={accessCode}
            onInput={(event) => setAccessCode(event.currentTarget.value)}
            required
          />
        </label>
      )}
      <div class="row voice-actions">
        {active ? (
          <button class="btn" type="button" disabled={status === 'ending'} onClick={end}>
            <Icon name="close" size={18} />{status === 'connecting' ? 'لغو اتصال' : 'پایان گفت\u200cوگو'}
          </button>
        ) : (
          <button class="btn primary" type="submit" disabled={!accessCode.trim() || !online || !canUseMic} aria-describedby="voice-privacy">
            <Icon name="mic" size={19} />{'شروع گفت\u200cوگو'}
          </button>
        )}
        <p role="status">{MESSAGES[status]}</p>
      </div>
      {!online && <p>{'برای گفت\u200cوگوی صوتی به اینترنت وصل شوید.'}</p>}
      {!canUseMic && <p>میکروفون در این مرورگر در دسترس نیست.</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  )
}

function VoicePoem({ id, fromWidget }) {
  const { data: poem, error, loading, retry } = useAsync(
    (signal) => fromWidget ? dailyPoemById(id) : getPoem(id, { signal }),
    [id, fromWidget],
  )
  const context = poem && voicePoemContext(poem, fromWidget)

  return (
    <article class="voice-page">
      <header class="row voice-heading">
        <a class="icon-btn" href={url('/poem/' + id)} aria-label="بازگشت به شعر"><Icon name="chevron" /></a>
        <h1>{TITLE}</h1>
      </header>
      {loading ? <Loading label="در حال بارگیری شعر" /> : error ? <ErrorState error={error} onRetry={retry} /> : context ? (
        <>
          <figure class="folio voice-folio">
            <blockquote>{context.focus_couplet}</blockquote>
            <figcaption><a href={url('/poem/' + id)}>{context.poem_title}</a></figcaption>
          </figure>
          <VoiceCall context={context} />
        </>
      ) : (
        <Empty>{'متن شعر برای گفت\u200cوگو در دسترس نیست.'}</Empty>
      )}
    </article>
  )
}

export default function Voice({ id }) {
  const { query } = useLocation()
  const fromWidget = query.widget === '1'
  useTitle(TITLE)
  if (!/^[1-9]\d*$/.test(id)) return <Empty>شناسهٔ شعر معتبر نیست.</Empty>
  return <VoicePoem key={id + ':' + fromWidget} id={id} fromWidget={fromWidget} />
}
