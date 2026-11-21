// Small stroke icons (24 grid). Decorative: always aria-hidden, the button carries the label.
const P = {
  home: 'M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z',
  poets: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c.6-3.6 3.6-5.5 8-5.5s7.4 1.9 8 5.5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  bookmark: 'M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z',
  more: 'M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z',
  play: 'M8 5v14l11-7z',
  pause: 'M8 5v14M16 5v14',
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
