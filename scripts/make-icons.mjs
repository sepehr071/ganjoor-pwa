// Generates public/icons/*.png and public/icon.svg: the brand emblem (an eight-point gold star with a turquoise
// centre on lapis, same shape as Emblem in src/components/Ornament.jsx). Run: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const INK = [11, 19, 48]
const TEAL = [95, 211, 199]
const GOLD = [214, 176, 90]

// Eight-point star on a 512 grid centred at 256: a square united with a diamond.
const inStar = (x, y, sq, di) => {
  const dx = Math.abs(x - 256), dy = Math.abs(y - 256)
  return Math.max(dx, dy) <= sq || dx + dy <= di
}
const colour = (x, y) =>
  (x - 256) ** 2 + (y - 256) ** 2 <= 46 * 46 ? TEAL : inStar(x, y, 76, 108) ? INK : inStar(x, y, 120, 170) ? GOLD : INK
const inCorner = (x, y, size, rad) => {
  const cx = Math.min(Math.max(x, rad), size - rad)
  const cy = Math.min(Math.max(y, rad), size - rad)
  return (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad
}

function render(size, maskable) {
  const S = size / 512
  const px = Buffer.alloc(size * size * 4)
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sj = 0; sj < 3; sj++)
        for (let si = 0; si < 3; si++) {
          const x = (i + (si + 0.5) / 3) / S
          const y = (j + (sj + 0.5) / 3) / S
          if (!maskable && !inCorner(x, y, 512, 112)) continue
          const c = colour(x, y)
          r += c[0]; g += c[1]; b += c[2]; a += 255
        }
      const o = (j * size + i) * 4
      const n = a / 255 || 1
      px[o] = r / n; px[o + 1] = g / n; px[o + 2] = b / n; px[o + 3] = a / 9
    }
  return px
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const c = Buffer.alloc(4)
  c.writeUInt32BE(crc(td))
  return Buffer.concat([len, td, c])
}
function png(size, maskable) {
  const px = render(size, maskable)
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon-192.png', png(192, false))
writeFileSync('public/icons/icon-512.png', png(512, false))
writeFileSync('public/icons/maskable-512.png', png(512, true))

const star = (sq, di, fill) =>
  `<path d="M${256 - sq} ${256 - sq}h${2 * sq}v${2 * sq}h${-2 * sq}zM256 ${256 - di}l${di} ${di}-${di} ${di}-${di}-${di}z" fill="${fill}"/>`
writeFileSync(
  'public/icon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#0b1330"/>${star(120, 170, '#d6b05a')}${star(76, 108, '#0b1330')}<circle cx="256" cy="256" r="46" fill="#5fd3c7"/></svg>\n`,
)
console.log('icons written')
