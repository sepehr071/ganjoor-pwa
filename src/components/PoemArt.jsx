import { url } from '../lib/base.js'
import { poemArt } from '../lib/poemArt.js'

const MARK_COLORS = [
  '#f5e5b7', '#d9a847', '#dc8550', '#efaa97',
  '#d46d60', '#aa5c78', '#a695cc', '#a5bae4',
  '#659fcb', '#64bcc3', '#83cfb9', '#508d89',
  '#6c9a5c', '#b8c86e', '#cdb88d', '#b47f5b',
]

export function PoemArt({ id }) {
  const art = poemArt(id)
  if (!art) return null
  const { scene, x, y, marks } = art

  return (
    <div class="poem-art" aria-hidden="true" style={{ '--poem-art-focus': `${x}% ${y}%` }}>
      <img src={url(`/art/poem-${scene}.webp`)} alt="" decoding="async" />
      <span class="poem-art-marks">
        {marks.map((mark, i) => <i key={i} style={{ backgroundColor: MARK_COLORS[mark] }} />)}
      </span>
    </div>
  )
}
