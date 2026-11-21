import { useState } from 'preact/hooks'
import { url } from '../lib/base.js'
import { getPoets, poetImage } from '../api.js'
import { useAsync, useTitle } from '../lib/hooks.js'
import { normalize, toFaDigits } from '../lib/poem.js'
import { ERAS, filterEra, compactYears, byLetter, displayName } from '../lib/poets.js'
import { Arch } from '../components/Arch.jsx'
import { Icon } from '../components/Icon.jsx'
import { Loading, ErrorState, Empty } from '../components/Status.jsx'

// The index rail is a scrubber for touch: slide along it to jump. It is hidden from assistive tech, which gets
// the letter headings instead.
function Rail({ letters }) {
  const [cur, setCur] = useState('')
  const jump = (e) => {
    const l = document.elementFromPoint(e.clientX, e.clientY)?.dataset?.l
    if (!l || l === cur) return
    setCur(l)
    document.getElementById('l-' + l)?.scrollIntoView({ block: 'start' })
  }
  return (
    <div
      class="rail"
      aria-hidden="true"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); jump(e) }}
      onPointerMove={(e) => e.buttons && jump(e)}
    >
      {letters.map((l) => (
        <span key={l} data-l={l} class={l === cur ? 'on' : undefined}>{l}</span>
      ))}
    </div>
  )
}

export default function Poets() {
  useTitle('شاعران')
  const [q, setQ] = useState('')
  const [era, setEra] = useState('all')
  const { data, error, loading, retry } = useAsync((signal) => getPoets({ signal }), [])
  const nq = normalize(q)
  const list = filterEra(data || [], era).filter((p) => !nq || normalize(p.name + ' ' + (p.nickname || '')).includes(nq))
  const groups = era === 'famous' ? [{ letter: '', items: list }] : byLetter(list)
  const featured = era === 'all' && !nq ? filterEra(data || [], 'famous').slice(0, 10) : []

  return (
    <div class="poets">
      <header class="page-head">
        <h1 class="display">شاعران</h1>
        <p>{data ? `${toFaDigits(data.length)} شاعر در گنجور` : 'فهرست شاعران گنجور'}</p>
      </header>
      <label class="search-pill">
        <Icon name="search" size={20} />
        <span class="sr-only">جستجوی نام شاعر</span>
        <input type="search" placeholder="نام شاعر…" value={q} onInput={(e) => setQ(e.currentTarget.value)} />
      </label>
      <div class="chip-row" role="group" aria-label="دوره">
        {ERAS.map(([k, label]) => (
          <button type="button" key={k} class="chip-btn" aria-pressed={era === k} onClick={() => setEra(k)}>{label}</button>
        ))}
      </div>

      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={retry} />}
      {data && !list.length && <Empty>شاعری با این نام در این دوره پیدا نشد.</Empty>}

      {featured.length > 0 && (
        <section aria-labelledby="feat-h">
          <h2 id="feat-h" class="section-title">پرخواننده{'\u200c'}ها</h2>
          <ul class="featured">
            {featured.map((p) => (
              <li key={p.id}>
                <a class="feat lapis" href={url('/poet/' + p.id)}>
                  <Arch src={poetImage(p)} name={displayName(p)} />
                  <span class="feat-name">{displayName(p)}</span>
                  <span class="feat-years">{compactYears(p)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {list.length > 0 && (
        <div class="letters">
          <div>
            {groups.map((g) => (
              <section key={g.letter} id={g.letter ? 'l-' + g.letter : undefined} aria-label={g.letter ? `حرف ${g.letter}` : 'پرخواننده\u200cها'}>
                {g.letter && <h2 class="letter-h"><span>{g.letter}</span></h2>}
                <ul class="list letter-rows">
                  {g.items.map((p) => (
                    <li key={p.id}>
                      <a class="list-link poet-row" href={url('/poet/' + p.id)}>
                        <Arch src={poetImage(p)} name={displayName(p)} class="xs" />
                        <span class="list-main list-title">{displayName(p)}</span>
                        <span class="years">{compactYears(p)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          {groups.length > 5 && <Rail letters={groups.map((g) => g.letter)} />}
        </div>
      )}
    </div>
  )
}
