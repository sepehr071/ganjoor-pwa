import { getVerseTiming } from '../api.js'
import { savedAudioPut } from './store.js'

export async function downloadRecitation(poem, recitation, signal) {
  const response = await fetch(recitation.mp3Url, { credentials: 'omit', signal })
  if (response.status !== 200) throw new Error(`Audio download returned HTTP ${response.status}`)
  const blob = await response.blob()
  if (!blob.size || !/^(audio\/|application\/octet-stream$)/i.test(blob.type)) {
    throw new Error('The download does not contain audio')
  }
  const timing = recitation.inSyncWithText
    ? await getVerseTiming(recitation.id, { timeout: 5000 }).catch(() => null)
    : null
  signal?.throwIfAborted()
  const { _fromSaved, ...snapshot } = poem
  await savedAudioPut(snapshot, { poemId: Number(poem.id), id: recitation.id, blob, timing })
}
