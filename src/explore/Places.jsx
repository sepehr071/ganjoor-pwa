import { useState } from 'preact/hooks'
import { url } from '../lib/base.js'
import { catGeotags, locations } from './api.js'
import { Page, Async, Empty, PoetSelect, useAsync } from './ui.jsx'
import { fa, fitBounds, makeProjector, regionOf, REGION_ORDER } from './util.js'

const HAFEZ_ROOT_CAT = '9'
const MAP_W = 800

// -> [{id, name, lat, lon, poems:[{id,title}]}]; one entry per place
async function loadPlaces(catId) {
  if (!catId) {
    const all = await locations()
    return (all || []).map((l) => ({ id: l.id, name: l.name, lat: l.latitude, lon: l.longitude, poems: [] }))
  }
  const tags = (await catGeotags(catId)) || []
  const by = new Map()
  for (const t of tags) {
    const l = t.location
    if (!l || !Number.isFinite(l.latitude)) continue
    if (!by.has(l.id)) by.set(l.id, { id: l.id, name: l.name, lat: l.latitude, lon: l.longitude, poems: [] })
    const g = by.get(l.id)
    if (!g.poems.some((p) => p.id === t.poemId)) g.poems.push({ id: t.poemId, title: (t.poem && t.poem.fullTitle) || 'شعر ' + fa(t.poemId) })
  }
  return [...by.values()]
}

function PlaceMap({ places, selected, onSelect }) {
  const b = fitBounds(places.map((p) => ({ lat: p.lat, lon: p.lon })))
  const pr = makeProjector(b, MAP_W)
  const lons = [], lats = []
  for (let x = Math.ceil(b.minLon / 5) * 5; x <= b.maxLon; x += 5) lons.push(x)
  for (let y = Math.ceil(b.minLat / 5) * 5; y <= b.maxLat; y += 5) lats.push(y)
  const top = new Set([...places].sort((a, c) => c.poems.length - a.poems.length).slice(0, 14).map((p) => p.id))
  return (
    <figure class="ex-map">
      <svg viewBox={`0 0 ${pr.width} ${pr.height}`} aria-hidden="true">
        <rect class="ex-map-bg" width={pr.width} height={pr.height} rx="10" />
        {lons.map((x) => {
          const { x: px } = pr.project(b.maxLat, x)
          return <line key={'x' + x} class="ex-grat" x1={px} x2={px} y1="0" y2={pr.height} />
        })}
        {lats.map((y) => {
          const { y: py } = pr.project(y, b.minLon)
          return <line key={'y' + y} class="ex-grat" x1="0" x2={pr.width} y1={py} y2={py} />
        })}
        {places.map((p) => {
          const { x, y } = pr.project(p.lat, p.lon)
          const sel = selected === p.id
          const r = 5 + Math.min(10, Math.sqrt(p.poems.length) * 2)
          return (
            <g key={p.id} class={'ex-pt' + (sel ? ' is-sel' : '')} onClick={() => onSelect(p.id)}>
              <circle cx={x} cy={y} r={Math.max(r, 11)} class="ex-pt-hit" />
              <circle cx={x} cy={y} r={r} class="ex-pt-dot" />
              {(sel || top.has(p.id)) && (
                <text x={x} y={y - r - 4} text-anchor="middle" class="ex-pt-label">
                  {p.name}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <figcaption class="ex-note">
        نقشهٔ ساده بر پایهٔ مختصات؛ مرز و ساحل ندارد. فهرست پایین همین مکان{'\u200c'}هاست و با صفحه{'\u200c'}کلید هم کار می{'\u200c'}کند.
      </figcaption>
    </figure>
  )
}

function PlaceList({ places, selected, onSelect }) {
  const groups = new Map()
  for (const p of places) {
    const r = regionOf(p.lat, p.lon)
    if (!groups.has(r)) groups.set(r, [])
    groups.get(r).push(p)
  }
  return REGION_ORDER.filter((r) => groups.has(r)).map((r) => {
    const list = groups.get(r).sort((a, b) => b.poems.length - a.poems.length || a.name.localeCompare(b.name, 'fa'))
    return (
      <section class="ex-group" key={r} aria-label={r}>
        <h3>
          {r} <span class="ex-num">{fa(list.length)}</span>
        </h3>
        <ul class="ex-rows">
          {list.map((p) => (
            <li key={p.id} id={'place-' + p.id}>
              {p.poems.length ? (
                <details open={selected === p.id} onToggle={(e) => e.currentTarget.open ? onSelect(p.id) : selected === p.id && onSelect(null)}>
                  <summary class="ex-row">
                    <span class="ex-name">{p.name}</span>
                    <span class="ex-num">{fa(p.poems.length)} شعر</span>
                  </summary>
                  <ul class="ex-links">
                    {p.poems.map((m) => (
                      <li key={m.id}>
                        <a href={url('/poem/' + m.id)}>{m.title}</a>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : (
                <div class="ex-row">
                  <span class="ex-name">{p.name}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    )
  })
}

export function Places() {
  const [catId, setCatId] = useState(HAFEZ_ROOT_CAT)
  const [selected, setSelected] = useState(null)
  const res = useAsync(() => loadPlaces(catId), [catId])
  const select = (id) => {
    setSelected(id)
    if (id) {
      const el = document.getElementById('place-' + id)
      el && el.scrollIntoView && el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }
  return (
    <Page title={"مکان\u200cها"} lead={"شهرها و جاهایی که در شعرها نامشان آمده. شاعری را برگزینید تا مکان\u200cهای شعرش را با شعرهایش ببینید."}>
      <PoetSelect id="places-poet" label="شاعر" by="rootCatId" allLabel={"همهٔ مکان\u200cها (بدون شعر)"} value={catId} onChange={(v) => { setSelected(null); setCatId(v) }} />
      <Async q={res} rows={6} isEmpty={(d) => !d || !d.length} empty={<Empty title="مکانی ثبت نشده" text={"برای این شاعر هنوز مکانی در شعرها نشانه\u200cگذاری نشده. شاعر دیگری را امتحان کنید."} />}>
        {(places) => (
          <>
            <p class="ex-count" aria-live="polite">{fa(places.length)} مکان</p>
            <PlaceMap places={places} selected={selected} onSelect={select} />
            <PlaceList places={places} selected={selected} onSelect={setSelected} />
          </>
        )}
      </Async>
    </Page>
  )
}
