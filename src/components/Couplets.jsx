import { useEffect, useRef, useState } from 'preact/hooks'
import { Icon } from './Icon.jsx'
import { Sheet } from './Sheet.jsx'
import { copyText, share } from '../lib/hooks.js'
import { write, COACH } from '../lib/store.js'
import { coupletText, parseMeaning, toFaDigits } from '../lib/poem.js'

export function LiteraryAnnotations({ items }) {
  return (
    <ul class="literary-annotations">
      {items.map(({ id, name, note, uncertain, source, originRef, parts }) => (
        <li key={id}>
          <b>{name}</b>{uncertain && <span class="muted"> (با تردید)</span>}
          {parts.length > 0 && <p>{parts.map(({ label, value }) => label ? `${label}: ${value}` : value).join('، ')}</p>}
          {note && <p>{note}</p>}
          <p class="muted small">
            منبع آرایه: گنجور
            {source && /^https?:\/\//i.test(source.url) ? (
              <>، <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title || source.name}</a>{source.license && <bdi> ({source.license})</bdi>}</>
            ) : originRef && <>، <bdi>{originRef}</bdi></>}
          </p>
        </li>
      ))}
    </ul>
  )
}

/**
 * Poem body. Tap a couplet to open its meaning in a bottom sheet (prev/next beyt, play from here, copy, share);
 * `playing` highlights the couplet being recited. `url` is the poem's address for sharing one beyt.
 */
export function Couplets({ couplets, playing = -1, onPlayFrom, annotations, credit, url }) {
  const [open, setOpen] = useState(-1)
  const body = useRef(null)

  useEffect(() => {
    const el = body.current?.querySelector('.is-playing')
    if (playing < 0 || open >= 0 || !el || document.querySelector('dialog[open]')) return
    const { top, bottom } = el.getBoundingClientRect()
    if (top >= innerHeight * 0.2 && bottom <= innerHeight * 0.7) return
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block: 'center', behavior: calm ? 'instant' : 'smooth' })
  }, [playing, open])

  const n = couplets.length
  const c = couplets[open]
  const m = c && parseMeaning(c.summary)
  const tags = c && annotations?.get(c.index)
  const text = c && coupletText(c) + (credit ? `\n— ${credit}` : '')

  return (
    <div class="poem-body" ref={body} lang="fa">
      {couplets.map((c, i) => (
        <div key={c.index} id={'b' + (i + 1)}
          aria-current={playing === i ? 'true' : undefined}
          class={`couplet${open === i ? ' is-open' : ''}${playing === i ? ' is-playing' : ''}`}>
          <button type="button"
            class={`beyt${c.single ? ' single' : ''}`}
            aria-haspopup="dialog"
            onClick={() => {
              setOpen(i)
              write(COACH, true)
            }}
          >
            <span class="m">{c.a}</span>
            {!c.single && <span class="sep" aria-hidden="true" />}
            {!c.single && <span class="m">{c.b}</span>}
          </button>
        </div>
      ))}

      <Sheet open={open >= 0} onClose={() => setOpen(-1)} label={`معنی بیت ${toFaDigits(open + 1)}`} class="meaning-sheet">
        {c && (
          <>
            <div class="sheet-head">
              <span class="rosette" aria-hidden="true" />
              <span class="sheet-kicker">بیت {toFaDigits(open + 1)} از {toFaDigits(n)}</span>
              <button type="button" class="icon-btn outline" aria-label="بیت قبلی" disabled={open === 0} onClick={() => setOpen(open - 1)}>
                <Icon name="chevron" size={18} />
              </button>
              <button type="button" class="icon-btn outline" aria-label="بیت بعدی" disabled={open === n - 1} onClick={() => setOpen(open + 1)}>
                <Icon name="chevron" size={18} class="flip" />
              </button>
            </div>
            <blockquote class="quote">
              <span class="m">{c.a}</span>
              {!c.single && c.b && <span class="m">{c.b}</span>}
            </blockquote>
            {m ? (
              <div class="meaning">
                <h3>{m.ai ? 'معنی (هوش مصنوعی)' : 'معنی'}</h3>
                <p>{m.text}</p>
              </div>
            ) : (
              <p class="no-meaning">برای این بیت معنایی ثبت نشده است.</p>
            )}
            {!!tags?.length && (
              <div class="meaning">
                <h3>آرایه{'\u200c'}های ادبی</h3>
                <LiteraryAnnotations items={tags} />
              </div>
            )}
            <div class="sheet-actions">
              {onPlayFrom && (
                <button type="button" class="btn primary grow" onClick={() => { onPlayFrom(open); setOpen(-1) }}>
                  <Icon name="play" size={18} fill /> پخش از این بیت
                </button>
              )}
              <button type="button" class="icon-btn outline lg" aria-label="رونوشت بیت" onClick={() => copyText(text)}>
                <Icon name="copy" size={20} />
              </button>
              {url && (
                <button type="button" class="icon-btn outline lg" aria-label={"هم\u200cرسانی بیت"} onClick={() => share({ title: credit || '', text, url: `${url}#b${open + 1}` })}>
                  <Icon name="share" size={20} />
                </button>
              )}
            </div>
          </>
        )}
      </Sheet>
    </div>
  )
}
