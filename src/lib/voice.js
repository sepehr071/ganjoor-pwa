import { coupletText, coupletsFromPlain, groupCouplets } from './poem.js'
import { pilotTokenUrl } from './voiceUrl.js'

export const voiceTokenUrl = import.meta.env.VITE_VOICE_TOKEN_URL && pilotTokenUrl(import.meta.env.VITE_VOICE_TOKEN_URL)

export function voicePoemContext(poem, fromWidget) {
  const couplets = poem.verses?.length ? groupCouplets(poem.verses) : coupletsFromPlain(poem.plainText)
  const focus = fromWidget ? poem.couplet : couplets.find((couplet) => couplet.a)
  if (!focus?.a) return null

  const focusIndex = couplets.findIndex(({ a, b }) => a === focus.a && (b || '') === (focus.b || ''))
  const contextStart = Math.max(0, focusIndex - 3)
  const title = poem.fullTitle || poem.title || ''
  return {
    poem_title: title.slice(0, 300),
    poem_text: couplets.slice(contextStart, contextStart + 18).map(coupletText).join('\n\n').slice(0, 3000),
    focus_couplet: coupletText(focus).slice(0, 600),
  }
}
