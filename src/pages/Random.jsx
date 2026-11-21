import { useLocation } from 'preact-iso'
import { getRandomPoem } from '../api.js'
import { useAsync, useTitle } from '../lib/hooks.js'
import { Loading, ErrorState } from '../components/Status.jsx'

// Picks a poem and replaces this history entry, so Back does not loop here. ?poet=ID limits it to one poet.
export default function Random() {
  useTitle('شعر تصادفی')
  const { route, query } = useLocation()
  const { error, retry } = useAsync(
    (signal) => getRandomPoem(query.poet || 0, { signal }).then((p) => route('/poem/' + p.id, true)),
    [query.poet],
  )
  return error ? <ErrorState error={error} onRetry={retry} /> : <Loading label="در حال انتخاب یک شعر" />
}
