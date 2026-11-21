export function Loading({ label = 'در حال بارگیری' }) {
  return (
    <div class="skeleton" role="status" aria-live="polite">
      <span class="sr-only">{label}</span>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <i key={i} />
      ))}
    </div>
  )
}

const MESSAGES = {
  404: 'چیزی با این نشانی پیدا نشد.',
  timeout: 'پاسخ دیر رسید. اتصال اینترنت را بررسی کنید و دوباره امتحان کنید.',
}

export function ErrorState({ error, onRetry }) {
  const offline = typeof navigator !== 'undefined' && !navigator.onLine
  const msg = offline
    ? 'اینترنت قطع است و این صفحه هنوز در دستگاه شما ذخیره نشده است. شعرهایی که قبلاً خوانده\u200cاید در حالت آفلاین هم باز می\u200cشوند.'
    : MESSAGES[error?.status] || MESSAGES[error?.message] || 'اتصال به گنجور برقرار نشد. کمی بعد دوباره امتحان کنید.'
  return (
    <div class="status error" role="alert">
      <p>{msg}</p>
      {onRetry && error?.status !== 404 && (
        <button type="button" class="btn" onClick={onRetry}>
          تلاش دوباره
        </button>
      )}
    </div>
  )
}

export function Empty({ children }) {
  return <div class="status">{children}</div>
}
