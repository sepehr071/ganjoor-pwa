import { useState } from 'preact/hooks'
import { url } from '../lib/base.js'
import { literaryDevices, literaryOverview, deviceConcepts, literaryTags } from './api.js'
import { Page, Async, Empty, Pager, useAsync } from './ui.jsx'
import { fa } from './util.js'

const TAKE = 15

function Tags({ device, concept }) {
  const [page, setPage] = useState(1)
  const q = useAsync(
    () => literaryTags({ deviceId: device.id, conceptId: concept ? concept.conceptId : '', skip: (page - 1) * TAKE, take: TAKE }),
    [device.id, concept && concept.conceptId, page],
  )
  return (
    <Async q={q} rows={4} isEmpty={(d) => !d || !d.items || !d.items.length} empty={<Empty title={"نمونه\u200cای نیست"} text={"برای این انتخاب هنوز بیتی نشانه\u200cگذاری نشده است."} />}>
      {(d) => {
        const pages = Math.max(1, Math.ceil(d.total / TAKE))
        return (
          <>
            <p class="ex-count" aria-live="polite">{fa(d.total)} نمونه</p>
            <ul class="ex-poems">
              {d.items.map((t) => (
                <li class="ex-poem" key={t.tagId}>
                  <a class="ex-poem-link" href={url('/poem/' + t.poemId)}>
                    <span class="ex-poem-lines">
                      <span>{t.hemistich1}</span>
                      <span>{t.hemistich2}</span>
                    </span>
                    {t.parts && t.parts.length > 0 && (
                      <span class="ex-parts">
                        {t.parts.map((p, i) => (
                          <span class="ex-tag" key={i}>
                            {p.slotName}: {p.words}
                          </span>
                        ))}
                      </span>
                    )}
                    <span class="ex-poem-meta">{t.poemFullTitle}</span>
                  </a>
                </li>
              ))}
            </ul>
            <Pager paging={{ page, pages, hasPrev: page > 1, hasNext: page < pages }} busy={q.loading} onPage={setPage} />
          </>
        )
      }}
    </Async>
  )
}

function DevicePanel({ device }) {
  const [concept, setConcept] = useState(null)
  const cq = useAsync(() => deviceConcepts(device.id), [device.id])
  return (
    <section class="ex-block" aria-labelledby="dev-h">
      <h2 id="dev-h">{device.name}</h2>
      <p>{device.definition}</p>
      {device.example && <p class="ex-sub">{device.example}</p>}
      {cq.data && cq.data.length > 0 && (
        <>
          <h3>پرتکرارترین مفهوم{'\u200c'}ها</h3>
          <ul class="ex-chips">
            {cq.data.map((c) => (
              <li key={c.conceptId}>
                <button
                  type="button"
                  class="ex-chip"
                  aria-pressed={concept && concept.conceptId === c.conceptId ? 'true' : 'false'}
                  onClick={() => setConcept(concept && concept.conceptId === c.conceptId ? null : c)}
                >
                  {c.name} <span class="ex-num">{fa(c.usageCount)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <Tags key={device.id + ':' + (concept ? concept.conceptId : '')} device={device} concept={concept} />
    </section>
  )
}

export function Literary() {
  const devices = useAsync(() => Promise.all([literaryDevices(), literaryOverview().catch(() => null)]), [])
  const [sel, setSel] = useState(null)
  return (
    <Page title={"آرایه\u200cهای ادبی"} lead={"تشبیه، استعاره و دیگر آرایه\u200cها، با نمونه\u200cهایی که در شعرها نشانه\u200cگذاری شده. فعلاً بیشتر نمونه\u200cها از دیوان حافظ است."}>
      <Async q={devices} rows={6} isEmpty={(d) => !d || !d[0] || !d[0].length}>
        {([list, overview]) => {
          const counts = new Map(((overview && overview.devices) || []).map((d) => [d.deviceId, d.tagCount]))
          const sorted = list.filter((d) => d.status !== 0).sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0))
          const current = sorted.find((d) => d.id === sel) || null
          return (
            <>
              <ul class="ex-chips ex-devices" aria-label={"آرایه\u200cها"}>
                {sorted.map((d) => (
                  <li key={d.id}>
                    <button type="button" class="ex-chip" aria-pressed={sel === d.id ? 'true' : 'false'} onClick={() => setSel(sel === d.id ? null : d.id)}>
                      {d.name} {counts.has(d.id) && <span class="ex-num">{fa(counts.get(d.id))}</span>}
                    </button>
                  </li>
                ))}
              </ul>
              {current ? <DevicePanel key={current.id} device={current} /> : <Empty title={"آرایه\u200cای را برگزینید"} text={"روی یکی از آرایه\u200cها بزنید تا تعریف و نمونه\u200cهایش را ببینید."} />}
            </>
          )
        }}
      </Async>
    </Page>
  )
}
