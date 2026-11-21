import { useTitle } from '../lib/hooks.js'
import { url } from '../lib/base.js'
import { Empty } from '../components/Status.jsx'

export default function NotFound() {
  useTitle('صفحه پیدا نشد')
  return (
    <Empty>
      <h1>صفحه پیدا نشد</h1>
      <p style="margin-top:.5rem">نشانی را بررسی کنید یا به <a href={url('/')}>صفحهٔ نخست</a> برگردید.</p>
    </Empty>
  )
}
