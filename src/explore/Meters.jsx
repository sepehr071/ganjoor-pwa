import { useState } from 'preact/hooks'
import { url } from '../lib/base.js'
import { rhythms, poemsSimilar } from './api.js'
import { Page, Async, Empty, SearchField, PoetSelect, Pager, PoemRow, useAsync } from './ui.jsx'
import { fa, matches } from './util.js'

const STEP = 60

// "فعولن فعولن (متقارب مثمن)" -> ["فعولن فعولن", "متقارب مثمن"]
export function splitMeter(r) {
  const m = /^(.*?)\s*\((.*)\)\s*$/.exec(r || '')
  return m ? [m[1], m[2]] : [r || '', '']
}

export function Meters() {
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(STEP)
  const res = useAsync(() => rhythms(), [])
  return (
    <Page title={"وزن\u200cهای شعر"} lead={"هر وزن با تعداد بیت\u200cهایی که در گنجور به آن سروده شده. یکی را باز کنید تا شعرهای هم\u200cوزن را بخوانید."}>
      <SearchField id="meter-q" label={"جستجو در وزن\u200cها"} placeholder="مثلاً رمل، هزج، فعولن" value={q} onInput={(v) => { setQ(v); setShown(STEP) }} />
      <Async q={res} rows={8} isEmpty={(d) => !d || !d.length}>
        {(all) => {
          const list = all.filter((m) => m.verseCount > 0 && (!q || matches(m.rhythm, q)))
          if (!list.length) return <Empty text="عبارت دیگری را امتحان کنید یا جستجو را پاک کنید." />
          return (
            <>
              <p class="ex-count" aria-live="polite">{fa(list.length)} وزن</p>
              <ul class="ex-rows">
                {list.slice(0, shown).map((m) => {
                  const [feet, name] = splitMeter(m.rhythm)
                  return (
                    <li key={m.id}>
                      <a class="ex-row" href={url('/meters/' + m.id)}>
                        <span class="ex-row-main">
                          <span class="ex-feet">{feet}</span>
                          {name && <span class="ex-sub">{name}</span>}
                        </span>
                        <span class="ex-num">{fa(m.verseCount)} بیت</span>
                      </a>
                    </li>
                  )
                })}
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

const PAGE_SIZE = 20

export function MeterDetail({ id }) {
  const meters = useAsync(() => rhythms(), [])
  const meter = meters.data && meters.data.find((m) => String(m.id) === String(id))
  const [rhymeDraft, setRhymeDraft] = useState('')
  const [rhyme, setRhyme] = useState('')
  const [poetId, setPoetId] = useState('')
  const [page, setPage] = useState(1)

  const poems = useAsync(
    () => (meter ? poemsSimilar({ metre: meter.rhythm, rhyme: rhyme.trim(), poetId, PageNumber: page, PageSize: PAGE_SIZE }) : null),
    [meter && meter.id, rhyme, poetId, page],
  )
  const [feet, name] = meter ? splitMeter(meter.rhythm) : ['', '']

  return (
    <Page title={feet || 'وزن'} lead={name || undefined} crumb={{ href: '/meters', label: 'همهٔ وزن\u200cها' }}>
      {meters.data && !meter ? (
        <Empty title="این وزن پیدا نشد" text={"شناسه\u200cاش در فهرست وزن\u200cها نیست."} action={<a class="ex-btn" href={url('/meters')}>بازگشت به فهرست</a>} />
      ) : (
        <>
          <form
            class="ex-filters"
            onSubmit={(e) => { e.preventDefault(); setPage(1); setRhyme(rhymeDraft) }}
          >
            <div class="ex-field">
              <label for="rhyme">حروف قافیه</label>
              <input id="rhyme" value={rhymeDraft} placeholder="مثلاً ارا" autocomplete="off" onInput={(e) => setRhymeDraft(e.currentTarget.value)} />
            </div>
            <PoetSelect id="meter-poet" label="شاعر" allLabel="همهٔ شاعران" value={poetId} onChange={(v) => { setPage(1); setPoetId(v) }} />
            <button type="submit" class="ex-btn ex-btn-primary">اعمال</button>
            {(rhyme || poetId) && (
              <button type="button" class="ex-btn" onClick={() => { setRhymeDraft(''); setRhyme(''); setPoetId(''); setPage(1) }}>
                پاک{'\u200c'}کردن فیلترها
              </button>
            )}
          </form>
          {meters.error || !meters.data ? (
            <Async q={meters}>{() => null}</Async>
          ) : (
            <Async q={poems} rows={6} isEmpty={(d) => !d || !d.data || !d.data.length} empty={<Empty text={"با این قافیه یا شاعر شعری با این وزن نیست. فیلترها را سبک\u200cتر کنید."} />}>
              {({ data, paging }) => (
                <>
                  <p class="ex-count" aria-live="polite">{fa(paging ? paging.total : data.length)} شعر</p>
                  <ul class="ex-poems">
                    {data.map((p) => (
                      <PoemRow key={p.id} id={p.id} title={p.fullTitle || p.title} lines={p.plainText} />
                    ))}
                  </ul>
                  <Pager paging={paging} busy={poems.loading} onPage={setPage} />
                </>
              )}
            </Async>
          )}
        </>
      )}
    </Page>
  )
}
