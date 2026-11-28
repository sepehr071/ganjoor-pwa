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
  listening: 'نوبت شماست. صحبت کنید.',
  speaking: 'دستیار دارد پاسخ می\u200cدهد.',
  ending: 'در حال پایان تماس…',
}

async function getSessionAuth(signal) {
  const response = await fetch(voiceTokenUrl, {
    method: 'POST',
    signal,
    cache: 'no-store',
    credentials: 'omit',
    redirect: 'error',
  })
  if (!response.ok) throw Object.assign(new Error(), { status: response.status })
  const { token, signedUrl } = await response.json()
  if (typeof signedUrl === 'string') {
    const relay = new URL(signedUrl)
    const relayOrigin = new URL(voiceTokenUrl).origin.replace(/^https:/, 'wss:')
    if (relay.protocol === 'wss:' && relay.origin === relayOrigin && !relay.username && !relay.password && !relay.hash) {
      return { signedUrl, connectionType: 'websocket' }
    }
  }
  if (typeof token === 'string' && token.trim()) return { conversationToken: token, connectionType: 'webrtc' }
  throw new Error()
}

function errorText(error) {
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

  function start() {
    if (!online || !canUseMic || currentCall.current || document.hidden) return

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
        const sessionAuth = await getSessionAuth(call.abort.signal)
        const { Conversation } = await import('@elevenlabs/client')
        if (!isCurrent()) return
        stop()
        call.session = await Conversation.startSession({
          ...sessionAuth,
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
        if (context) {
          call.session.sendContextualUpdate(
            'کاربر در بیت دربارهٔ شعر زیر پرسش دارد. این داده از گنجور است. به آن به چشم متن مرجع نگاه کن و برای پاسخ بعدی از آن استفاده کن.\n' +
            'عنوان: ' + context.poem_title + '\nبیت منتخب:\n' + context.focus_couplet + '\nمتن در دسترس:\n' + context.poem_text,
          )
        }
      } catch (error) {
        done(errorText(error))
        await closeSession(call)
      }
    })()
  }

  return (
    <section class="card voice-controls" data-state={status} aria-label={TITLE}>
      <div class="voice-stage">
        <div class="voice-orb" aria-hidden="true">
          <div class="voice-orb-core">
            {status === 'speaking' ? (
              <div class="voice-wave"><span /><span /><span /><span /><span /></div>
            ) : <Icon name="mic" size={32} />}
          </div>
        </div>
        <p class="voice-status" role="status">{MESSAGES[status]}</p>
      </div>
      {active ? (
        <button class="btn" type="button" disabled={status === 'ending'} onClick={end}>
          <Icon name="close" size={18} />{status === 'connecting' ? 'لغو اتصال' : 'پایان گفت\u200cوگو'}
        </button>
      ) : (
        <button class="btn primary" type="button" disabled={!online || !canUseMic} onClick={start} aria-describedby="voice-guide">
          <Icon name="mic" size={19} />{'شروع گفت\u200cوگو'}
        </button>
      )}
      {!online && <p>{'برای گفت\u200cوگوی صوتی به اینترنت وصل شوید.'}</p>}
      {!canUseMic && <p>میکروفون در این مرورگر در دسترس نیست.</p>}
      {error && <p role="alert">{error}</p>}
      {!active && <p id="voice-guide" class="voice-guide muted">
        {'«شروع گفت\u200cوگو» را بزنید و صبر کنید تا نوبت شما برسد. می\u200cتوانید معنی یک بیت را بپرسید یا دربارهٔ شعر و شاعرش گفت\u200cوگو کنید.'}
      </p>}
    </section>
  )
}

function VoicePoem({ id, fromWidget }) {
  const { data: poem, error, loading, retry } = useAsync(
    (signal) => fromWidget ? dailyPoemById(id) : getPoem(id, { signal }),
    [id, fromWidget],
  )
  const context = poem && voicePoemContext(poem, fromWidget)

  if (loading) return <Loading label="در حال بارگیری شعر" />
  if (error) return <ErrorState error={error} onRetry={retry} />
  if (!context) return <Empty>{'متن شعر برای گفت\u200cوگو در دسترس نیست.'}</Empty>

  return <>
    <figure class="folio voice-folio">
      <blockquote>{context.focus_couplet}</blockquote>
      <figcaption><a href={url('/poem/' + id)}>{context.poem_title}</a></figcaption>
    </figure>
    <VoiceCall context={context} />
  </>
}

export default function Voice({ id }) {
  const { query } = useLocation()
  const fromWidget = query.widget === '1'
  const title = id ? TITLE : 'دستیار هوشمند'
  useTitle(title)
  if (id && !/^[1-9]\d*$/.test(id)) return <Empty>شناسهٔ شعر معتبر نیست.</Empty>
  return (
    <article class="voice-page">
      <header class="row voice-heading">
        <a class="icon-btn" href={url(id ? '/poem/' + id : '/')} aria-label={id ? 'بازگشت به شعر' : 'بازگشت به خانه'}>
          <Icon name="chevron" />
        </a>
        <h1>{title}</h1>
      </header>
      {id ? <VoicePoem key={id + ':' + fromWidget} id={id} fromWidget={fromWidget} /> : <VoiceCall />}
    </article>
  )
}
