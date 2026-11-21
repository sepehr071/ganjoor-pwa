import { useTitle } from '../lib/hooks.js'
import { useStored, HISTORY } from '../lib/store.js'
import { PoemRow } from '../components/PoemRow.jsx'
import { Empty } from '../components/Status.jsx'

export default function History() {
  useTitle('خوانده\u200cشده\u200cها')
  const [list, setList] = useStored(HISTORY, [])
  return (
    <div class="stack-lg">
      <div class="page-head row" style="justify-content:space-between">
        <h1>خوانده{'\u200c'}شده{'\u200c'}ها</h1>
        {list.length > 0 && <button type="button" class="btn" onClick={() => setList([])}>پاک کردن فهرست</button>}
      </div>
      {list.length ? (
        <ul class="list poem-list">
          {list.map((h) => (
            <PoemRow key={h.id} {...h} onRemove={() => setList((l) => l.filter((x) => x.id !== h.id))} />
          ))}
        </ul>
      ) : (
        <Empty>شعری را هنوز نخوانده{'\u200c'}اید. شعرهایی که باز می{'\u200c'}کنید اینجا می{'\u200c'}ماند و در صفحهٔ نخست می{'\u200c'}توانید ادامه{'\u200c'}شان بدهید.</Empty>
      )}
    </div>
  )
}
