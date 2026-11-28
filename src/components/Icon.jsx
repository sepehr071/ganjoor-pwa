// Small stroke icons (24 grid). Decorative: always aria-hidden, the button carries the label.
const P = {
  home: 'M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z',
  poets: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c.6-3.6 3.6-5.5 8-5.5s7.4 1.9 8 5.5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  bookmark: 'M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z',
  more: 'M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z',
  literary: 'M4 20 14 10M7 17c-1-4 1-8 5-11 2-1.5 5-2.5 8-2-0.5 3-1.5 6-3 8-3 4-7 6-11 5M10 20h10',
  meter: 'M3 12h3l2-5 4 10 4-10 2 5h3',
  people: 'M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6 20v-1a6 6 0 0 1 12 0v1M4 12a2.5 2.5 0 1 1 2.5-2.5M20 12a2.5 2.5 0 1 0-2.5-2.5M2 19v-1a4 4 0 0 1 4-4M22 19v-1a4 4 0 0 0-4-4',
  museum: 'M3 20h18M5 20V9l7-5 7 5v11M9 20v-5c0-2 1-3 3-4 2 1 3 2 3 4v5M5 9h14',
  places: 'M19 10c0 5-7 10-7 10s-7-5-7-10a7 7 0 0 1 14 0ZM14.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z',
  faal: 'm12 3 3 3h3v3l3 3-3 3v3h-3l-3 3-3-3H6v-3l-3-3 3-3V6h3zM12 9l3 3-3 3-3-3z',
  random: 'M3 7h3a3 3 0 0 1 2.5 1.3l7 7.4A3 3 0 0 0 18 17h3M18 14l3 3-3 3M3 17h3a3 3 0 0 0 2.5-1.3L10 14M14 10l1.5-1.7A3 3 0 0 1 18 7h3M18 4l3 3-3 3',
  history: 'M4 5v5h5M4.3 10a8 8 0 1 1 .7 6M12 8v4l3 2',
  about: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 11v5M12 8h.01',
  play: 'M8 5v14l11-7z',
  pause: 'M8 5v14M16 5v14',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11v1a7 7 0 0 0 14 0v-1M12 19v3M9 22h6',
  share: 'M12 15V4M8 8l4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6',
  copy: 'M9 9h10v11H9zM5 15V5a1 1 0 0 1 1-1h9',
  offline: 'M12 4v11M8 11l4 4 4-4M5 19h14',
  check: 'M5 12.5 10 17l9-10',
  close: 'M6 6l12 12M18 6 6 18',
  minus: 'M6 12h12',
  plus: 'M12 6v12M6 12h12',
  chevron: 'M9 6l6 6-6 6',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 7a2 2 0 1 0 0 .01M9 17a2 2 0 1 0 0 .01',
  repeat: 'M5 12a6 6 0 0 1 6-6h8M16 3l3 3-3 3M19 12a6 6 0 0 1-6 6H5M8 21l-3-3 3-3',
  dots: 'M4.5 12h1.5M11.25 12h1.5M18 12h1.5',
  phone: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
}

export function Icon({ name, size = 22, fill = false, class: cls }) {
  return (
    <svg
      class={cls}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={P[name]} />
    </svg>
  )
}
