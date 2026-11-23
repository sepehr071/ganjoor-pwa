import { get } from '../api.js'

function partText(part, byIndex) {
  const couplet = byIndex.get(part.coupletIndex)
  const line = part.misra === 1 ? couplet?.a : part.misra === 2 ? couplet?.b : null
  if (!line || !Number.isInteger(part.wordStart) || !Number.isInteger(part.wordEnd) ||
      part.wordStart < 1 || part.wordEnd < part.wordStart) return ''
  return line.trim().split(/\s+/u).slice(part.wordStart - 1, part.wordEnd).join(' ')
}

/** Resolve the published tags into display labels using Ganjoor's device and source dictionaries. */
export async function getLiteraryAnnotations(poemId, couplets, signal) {
  const { data: tags } = await get(`/ganjoor/literary/poem/${poemId}/tags`, null, { signal })
  if (signal.aborted || !Array.isArray(tags) || !tags.length) return null
  const [devices, sources] = await Promise.all([
    get('/ganjoor/literary/devices').then((r) => r.data),
    tags.some((tag) => tag.originRef)
      ? get('/ganjoor/literary/sources').then((r) => r.data).catch(() => [])
      : [],
  ])
  const byDevice = new Map(devices.map((device) => [device.id, device]))
  const bySource = new Map(sources.map((source) => [source.key, source]))
  const byIndex = new Map(couplets.map((couplet) => [couplet.index, couplet]))
  const annotations = new Map()
  for (const tag of tags) {
    const device = byDevice.get(tag.deviceId)
    if (!device || (tag.coupletIndex !== -1 && !byIndex.has(tag.coupletIndex))) continue
    const parts = (tag.parts || []).flatMap((part) => {
      const label = device.slots?.find((slot) => slot.id === part.slotId)?.name
      const quote = partText(part, byIndex)
      const explanation = part.text || part.concept?.name
      const value = quote && explanation && quote !== explanation ? `«${quote}» (${explanation})` : quote || explanation
      return value ? [{ id: part.id, label, value }] : []
    })
    const list = annotations.get(tag.coupletIndex) || []
    list.push({
      id: tag.id,
      name: device.name,
      note: tag.note,
      uncertain: tag.uncertain,
      source: bySource.get(tag.originRef),
      originRef: tag.originRef,
      parts,
    })
    annotations.set(tag.coupletIndex, list)
  }
  return annotations
}
