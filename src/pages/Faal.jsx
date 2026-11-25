import { useRef, useState } from 'preact/hooks'
import { url } from '../lib/base.js'
import { getFaal } from '../api.js'
import { useTitle } from '../lib/hooks.js'
import { groupCouplets } from '../lib/poem.js'
import { Couplets } from '../components/Couplets.jsx'
import { PoemArt } from '../components/PoemArt.jsx'
import { ErrorState } from '../components/Status.jsx'
import { Sarlowh, Shamseh } from '../components/Ornament.jsx'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export default function Faal() {
  useTitle('فال حافظ')
  const [phase, setPhase] = useState('idle') // idle | drawing | shown | error
  const [poem, setPoem] = useState(null)
  const [error, setError] = useState(null)
  const headRef = useRef(null)
  const drawing = phase === 'drawing'

  const draw = async () => {
    setPhase('drawing')
    try {
      // The pause is deliberate: a moment to hold the intention before the poem appears.
      const [p] = await Promise.all([getFaal(), wait(2200)])
      setPoem(p)
      setPhase('shown')
      setTimeout(() => headRef.current?.focus(), 50)
    } catch (e) {
      setError(e)
      setPhase('error')
    }
  }

  return (
    <div class="stack-lg">
      <div class="page-head">
        <h1 class="display">فال حافظ</h1>
        <p>نیت کنید، نفسی بکشید و فال بگیرید.</p>
      </div>

      {(phase === 'idle' || drawing) && (
        <div class="faal-stage" role={drawing ? 'status' : undefined}>
          <div class="faal-picture">
            <img class="faal-plate" src={url('/art/draw-hafez.webp')} alt="" width="800" height="450" />
            {drawing && <Shamseh turning />}
          </div>
          {drawing ? <p class="muted">دلتان را به حافظ بسپارید…</p>
            : <button type="button" class="btn primary" onClick={draw}>نیت کردم</button>}
        </div>
      )}
      {phase === 'error' && <ErrorState error={error} onRetry={draw} />}
      {phase === 'shown' && poem && (
        <div class="faal-reveal">
          <div class="folio">
            <header class="folio-head">
              <Sarlowh />
              <h2 ref={headRef} tabIndex={-1} class="display" style="outline:none">{poem.title}</h2>
            </header>
            <PoemArt id={poem.id} />
            <Couplets couplets={groupCouplets(poem.verses || [])} credit={`${poem.fullTitle}، گنجور`} url={location.origin + url('/poem/' + poem.id)} />
          </div>
          <p class="credit">منبع: <a href={'https://ganjoor.net' + poem.fullUrl} target="_blank" rel="noopener noreferrer">گنجور</a></p>
          <div class="row" style="margin-top:1.25rem">
            <a class="btn primary" href={url('/poem/' + poem.id)}>خواندن و شنیدن این غزل</a>
            <button type="button" class="btn" onClick={draw}>فال دیگر</button>
          </div>
        </div>
      )}
    </div>
  )
}
