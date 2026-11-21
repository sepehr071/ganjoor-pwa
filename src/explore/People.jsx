import { useEffect, useRef, useState } from 'preact/hooks'
import { url } from '../lib/base.js'
import { people, person, personRelations, personTree, personPoems } from './api.js'
import { Page, Async, Empty, SearchField, PoemRow, useAsync } from './ui.jsx'
import { fa, matches, layoutTree } from './util.js'

const STEP = 60

export function People() {
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(STEP)
  const res = useAsync(() => people(), [])
  return (
    <Page title={"شخصیت\u200cها"} lead={"کسانی که در شعرها نامشان آمده، به\u200cویژه شخصیت\u200cهای شاهنامه و خمسه، با خویشاوندی\u200cها و شجره\u200cنامه."}>
      <SearchField id="people-q" label="جستجوی نام" placeholder="مثلاً رستم، سیاوش، شیرین" value={q} onInput={(v) => { setQ(v); setShown(STEP) }} />
      <Async q={res} rows={8} isEmpty={(d) => !d || !d.length}>
        {(all) => {
          const list = all
            .filter((p) => !q || matches(p.name, q) || matches(p.aliases, q))
            .sort((a, b) => b.importance - a.importance || a.name.localeCompare(b.name, 'fa'))
          if (!list.length) return <Empty text="نام دیگری را امتحان کنید." />
          return (
            <>
              <p class="ex-count" aria-live="polite">{fa(list.length)} شخصیت</p>
              <ul class="ex-rows">
                {list.slice(0, shown).map((p) => (
                  <li key={p.id}>
                    <a class="ex-row" href={url('/people/' + p.id)}>
                      <span class="ex-row-main">
                        <span class="ex-name">{p.name}</span>
                        {p.description && <span class="ex-sub ex-clamp">{p.description}</span>}
                      </span>
                      {p.familyTreeCaption && <span class="ex-tag">{p.familyTreeCaption}</span>}
                    </a>
                  </li>
                ))}
              </ul>
              {list.length > shown && (
                <button type="button" class="ex-btn ex-more" onClick={() => setShown(shown + STEP)}>
                  نمایش بیشتر
                </button>
              )}
            </>
          )
        }}
      </Async>
    </Page>
  )
}

// Relation kinds are relative to the page's person. 1 and 2 are not documented by the API:
// read as sibling and spouse from the few samples seen.
function groupRelations(rels) {
  const defs = [
    ['والدین', (r) => r.relationType === 0 && !r.subjectIsPerson1],
    ['فرزندان', (r) => r.relationType === 0 && r.subjectIsPerson1],
    ['نیاکان', (r) => r.relationType === 3 && !r.subjectIsPerson1],
    ['نوادگان', (r) => r.relationType === 3 && r.subjectIsPerson1],
    ['برادران و خواهران', (r) => r.relationType === 1],
    ['همسران', (r) => r.relationType === 2],
  ]
  const used = new Set()
  const groups = defs.map(([label, test]) => {
    const items = rels.filter((r) => test(r) && !used.has(r))
    items.forEach((r) => used.add(r))
    return { label, items }
  })
  const rest = rels.filter((r) => !used.has(r))
  if (rest.length) groups.push({ label: 'خویشاوندان', items: rest })
  return groups.filter((g) => g.items.length)
}

const years = (p) =>
  [p.validBirthDate && `زادهٔ ${fa(p.birthYearInLHijri)} ه‍.ق`, p.validDeathDate && `درگذشتهٔ ${fa(p.deathYearInLHijri)} ه‍.ق`]
    .filter(Boolean)
    .join('، ')

function Evidence({ items }) {
  const e = items && items[0]
  if (!e) return null
  return (
    <a class="ex-evidence" href={url('/poem/' + e.poemId)}>
      {e.coupletText}
    </a>
  )
}

function Relations({ id }) {
  const q = useAsync(() => personRelations(id), [id])
  return (
    <section class="ex-block" aria-labelledby="rel-h">
      <h2 id="rel-h">خویشاوندی{'\u200c'}ها</h2>
      <Async q={q} rows={3} isEmpty={(d) => !d || (!d.relations.length && !d.affiliations.length)} empty={<Empty title="خویشاوندی ثبت نشده" text="برای این شخصیت در گنجور پیوندی ثبت نشده است." />}>
        {(d) => (
          <>
            {groupRelations(d.relations).map((g) => (
              <div class="ex-group" key={g.label}>
                <h3>{g.label}</h3>
                <ul class="ex-rows">
                  {g.items.map((r) => (
                    <li key={r.id}>
                      <a class="ex-row" href={url('/people/' + r.otherPersonId)}>
                        <span class="ex-row-main">
                          <span class="ex-name">{r.otherPersonName}</span>
                          {r.note && <span class="ex-sub">{r.note}</span>}
                        </span>
                      </a>
                      <Evidence items={r.evidence} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {d.affiliations.length > 0 && (
              <div class="ex-group">
                <h3>پیوندها</h3>
                <ul class="ex-rows">
                  {d.affiliations.map((r) => (
                    <li key={'a' + r.id}>
                      <a class="ex-row" href={url('/people/' + r.otherPersonId)}>
                        <span class="ex-row-main">
                          <span class="ex-name">{r.otherPersonName}</span>
                          {r.note && <span class="ex-sub">{r.note}</span>}
                        </span>
                      </a>
                      <Evidence items={r.evidence} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </Async>
    </section>
  )
}

const COL_W = 148
const NODE_W = 124
const ROW_H = 46
const NODE_H = 34
const PAD = 12

export function FamilyTree({ tree, currentId }) {
  const wrap = useRef(null)
  const names = new Map(tree.persons.map((p) => [p.id, p.name]))
  const lay = layoutTree(tree.persons, tree.relations)
  const W = (lay.depths - 1) * COL_W + NODE_W + PAD * 2
  const H = (lay.rows - 1) * ROW_H + NODE_H + PAD * 2
  // RTL reading order: the oldest generation sits on the right.
  const pos = new Map(lay.nodes.map((n) => [n.id, { x: W - PAD - NODE_W - n.depth * COL_W, y: PAD + n.row * ROW_H }]))

  useEffect(() => {
    const el = wrap.current && wrap.current.querySelector('[aria-current="true"]')
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [currentId, tree])

  const kids = new Map()
  for (const e of lay.edges) {
    if (e.kind === 'extra') continue
    if (!kids.has(e.from)) kids.set(e.from, [])
    kids.get(e.from).push(e.to)
  }
  const hasParent = new Set(lay.edges.filter((e) => e.kind !== 'extra').map((e) => e.to))
  const roots = lay.nodes.filter((n) => !hasParent.has(n.id)).map((n) => n.id)
  const outline = (id, seen) => {
    if (seen.has(id)) return null
    seen.add(id)
    const c = kids.get(id) || []
    return (
      <li key={id}>
        <a href={url('/people/' + id)}>{names.get(id)}</a>
        {c.length > 0 && <ul>{c.map((k) => outline(k, seen))}</ul>}
      </li>
    )
  }
  const seen = new Set()

  return (
    <>
      <div class="ex-tree" ref={wrap} tabIndex={0} role="region" aria-label={`شجره\u200cنامه با ${fa(tree.persons.length)} نفر. با کلید Tab میان نام\u200cها بروید.`}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="group" aria-label={"نمودار شجره\u200cنامه"}>
          {lay.edges.map((e, i) => {
            const a = pos.get(e.from), b = pos.get(e.to)
            const x1 = a.x, y1 = a.y + NODE_H / 2, x2 = b.x + NODE_W, y2 = b.y + NODE_H / 2
            const mx = (x1 + x2) / 2
            return <path key={i} class={'ex-edge ex-edge-' + e.kind} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} />
          })}
          {lay.nodes.map((n) => {
            const p = pos.get(n.id)
            const cur = n.id === currentId
            return (
              <a key={n.id} href={url('/people/' + n.id)} aria-current={cur ? 'true' : undefined} aria-label={names.get(n.id)}>
                <g class={'ex-node' + (cur ? ' is-current' : '')} transform={`translate(${p.x},${p.y})`}>
                  <rect width={NODE_W} height={NODE_H} rx="8" />
                  <text x={NODE_W / 2} y={NODE_H / 2} text-anchor="middle" dominant-baseline="central">
                    {names.get(n.id)}
                  </text>
                </g>
              </a>
            )
          })}
        </svg>
      </div>
      <p class="ex-note">خط پیوسته فرزند است، خط{'\u200c'}چین والد دیگر، نقطه{'\u200c'}چین نیای دور. کهن{'\u200c'}ترین نسل سمت راست است.</p>
      <details class="ex-outline">
        <summary>نمای متنی درخت</summary>
        <ul>{roots.map((r) => outline(r, seen))}</ul>
      </details>
    </>
  )
}

function TreeSection({ id }) {
  const q = useAsync(() => personTree(id), [id])
  return (
    <section class="ex-block" aria-labelledby="tree-h">
      <h2 id="tree-h">شجره{'\u200c'}نامه</h2>
      <Async q={q} rows={4} isEmpty={(d) => !d || d.persons.length < 2} empty={<Empty title={"شجره\u200cنامه\u200cای نیست"} text={"خویشاوندی\u200cای برای رسم درخت ثبت نشده است."} />}>
        {(t) => (
          <>
            {t.books && t.books.length > 0 && <p class="ex-sub">منبع: {t.books.map((b) => b.title).join('، ')}</p>}
            <FamilyTree tree={t} currentId={Number(id)} />
          </>
        )}
      </Async>
    </section>
  )
}

function PoemsSection({ id }) {
  const q = useAsync(() => personPoems(id), [id])
  const [shown, setShown] = useState(15)
  return (
    <section class="ex-block" aria-labelledby="pp-h">
      <h2 id="pp-h">در شعرها</h2>
      <Async q={q} rows={4} isEmpty={(d) => !d || !d.length} empty={<Empty title="شعری ثبت نشده" text="هنوز بیتی به این شخصیت پیوند نخورده است." />}>
        {(list) => (
          <>
            <p class="ex-count">{fa(list.length)} بیت</p>
            <ul class="ex-poems">
              {list.slice(0, shown).map((x) => (
                <PoemRow key={x.id} id={x.poemId} title={x.poem && x.poem.fullTitle} lines={x.coupletText ? [x.coupletText] : []} />
              ))}
            </ul>
            {list.length > shown && (
              <button type="button" class="ex-btn ex-more" onClick={() => setShown(shown + 15)}>
                نمایش بیشتر
              </button>
            )}
          </>
        )}
      </Async>
    </section>
  )
}

export function PersonDetail({ id }) {
  const q = useAsync(() => person(id), [id])
  return (
    <Page title={(q.data && q.data.name) || 'شخصیت'} lead={q.data && q.data.description} crumb={{ href: '/people', label: 'همهٔ شخصیت\u200cها' }} wide>
      <Async q={q} rows={3}>
        {(p) => (
          <>
            {(years(p) || p.aliases || p.wikiUrl) && (
              <p class="ex-sub">
                {[years(p), p.aliases && `نام\u200cهای دیگر: ${p.aliases}`].filter(Boolean).join(' | ')}
                {p.wikiUrl && (
                  <>
                    {' '}
                    <a href={p.wikiUrl} target="_blank" rel="noopener noreferrer">ویکی{'\u200c'}پدیا</a>
                  </>
                )}
              </p>
            )}
            <Relations id={id} />
            <TreeSection id={id} />
            <PoemsSection id={id} />
          </>
        )}
      </Async>
    </Page>
  )
}
