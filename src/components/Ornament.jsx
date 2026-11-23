import { url } from '../lib/base.js'

export function Emblem({ class: cls = 'brand-emblem' }) {
  return <img class={cls} src={url('/icons/beyt-192.png')} width="192" height="192" alt="" />
}

// Hand-drawn manuscript ornaments. Decorative only (aria-hidden); colours come from CSS (currentColor = gold).
/** Sarlowh: the illuminated head-piece above a title. */
export function Sarlowh() {
  return (
    <svg class="sarlowh" viewBox="0 0 240 30" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round">
        <path d="M6 15h62M172 15h62" />
        <path d="M30 11h38M172 11h38M30 19h38M172 19h38" opacity=".55" />
        <path d="M84 15c10-13 30-14 36-13 6-1 26 0 36 13-10 13-30 14-36 13-6 1-26 0-36-13Z" />
        <path d="M70 15c4-5 9-5 14 0-5 5-10 5-14 0ZM156 15c5-5 10-5 14 0-4 5-9 5-14 0Z" />
      </g>
      <path class="fill" d="M96 15c8-8 18-9 24-8 6-1 16 0 24 8-8 8-18 9-24 8-6 1-16 0-24-8Z" opacity=".9" />
      <path d="M120 8l3 7-3 7-3-7Z" fill="currentColor" />
      <circle class="dot" cx="6" cy="15" r="2.2" />
      <circle class="dot" cx="234" cy="15" r="2.2" />
    </svg>
  )
}

/** Shamseh: a sunburst medallion for the faal. */
export function Shamseh({ turning, class: cls = '' }) {
  const petals = Array.from({ length: 16 }, (_, i) => i * 22.5)
  return (
    <svg class={`shamseh${turning ? ' turning' : ''} ${cls}`} viewBox="-100 -100 200 200" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" stroke-width="1.4">
        <circle r="96" stroke-dasharray="1 5" stroke-linecap="round" stroke-width="2.4" />
        <circle r="88" />
        {petals.map((a) => (
          <path key={a} d="M0-86c9 14 9 26 0 36-9-10-9-22 0-36Z" transform={`rotate(${a})`} />
        ))}
        <path d="M-40-40H40V40H-40Z" />
        <path d="M-40-40H40V40H-40Z" transform="rotate(45)" />
      </g>
      <path class="fill" d="M-26-26H26V26H-26Z" opacity=".85" />
      <path class="fill" d="M-26-26H26V26H-26Z" transform="rotate(45)" opacity=".85" />
      <circle r="13" fill="var(--surface)" />
      <circle class="dot" r="6" />
    </svg>
  )
}
