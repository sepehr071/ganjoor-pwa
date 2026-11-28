import { once } from 'node:events'
import { afterEach, expect, it, vi } from 'vitest'
import { createVoiceServer } from './voice.mjs'

const env = {
  ELEVENLABS_API_KEY: 'test-workspace-key',
  ELEVENLABS_AGENT_ID: 'agent_pilot',
}
const origin = 'https://localhost'
let server, endpoint, upstream
const relayUrl = 'wss://beyt.example/voice/stream'
const signedUpstream = 'wss://api.elevenlabs.io/v1/convai/conversation?agent_id=agent_pilot&conversation_signature=voice-signature'

it('rejects using local CLI credentials on a non-loopback bind', () => {
  expect(() => createVoiceServer({
    env: { ...env, ELEVENLABS_API_KEY: '', BEYT_VOICE_LOCAL_OAUTH: '1', BEYT_VOICE_HOST: '0.0.0.0' },
  })).toThrow('127.0.0.1')
})

async function listen(serverEnv = env) {
  upstream = vi.fn().mockResolvedValue(Response.json({ token: 'session-token', conversation_id: 'internal-id' }))
  server = createVoiceServer({ env: serverEnv, fetchUpstream: upstream }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  endpoint = `http://127.0.0.1:${server.address().port}/voice/token`
}

afterEach(async () => {
  if (server?.listening) {
    server.close()
    await once(server, 'close')
  }
})

it('returns an uncached token in the workspace default environment without an access code', async () => {
  await listen()
  const response = await fetch(endpoint, { method: 'POST', headers: { origin } })
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(response.headers.get('access-control-allow-origin')).toBe(origin)
  expect(await response.json()).toEqual({ token: 'session-token' })
  const [url, options] = upstream.mock.calls[0]
  expect(url.href).toBe('https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=agent_pilot')
  expect(options.headers).toEqual({ 'xi-api-key': env.ELEVENLABS_API_KEY })
  expect(options.redirect).toBe('error')
})

it('relay returns a single-use signed URL on the configured relay', async () => {
  await listen({ ...env, BEYT_VOICE_RELAY_URL: relayUrl })
  upstream.mockResolvedValueOnce(Response.json({ signed_url: signedUpstream }))

  const response = await fetch(endpoint, { method: 'POST', headers: { origin } })
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(await response.json()).toEqual({ signedUrl: `${relayUrl}?conversation_signature=voice-signature` })
  expect(upstream.mock.calls[0][0].href).toBe('https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=agent_pilot&include_conversation_id=true')
})

it('relay rejects a signed URL for a different host or agent', async () => {
  await listen({ ...env, BEYT_VOICE_RELAY_URL: relayUrl })
  for (const signed_url of [signedUpstream.replace('api.elevenlabs.io', 'example.com'), signedUpstream.replace('agent_pilot', 'agent_other')]) {
    upstream.mockResolvedValueOnce(Response.json({ signed_url }))
    const response = await fetch(endpoint, { method: 'POST', headers: { origin } })
    expect(response.status).toBe(502)
  }
})

it('allows a legacy Authorization preflight without issuing a token', async () => {
  await listen()
  const origin = 'http://127.0.0.1:5173'
  const response = await fetch(endpoint, {
    method: 'OPTIONS',
    headers: { origin, 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization' },
  })
  expect(response.status).toBe(204)
  expect(response.headers.get('access-control-allow-origin')).toBe(origin)
  expect(response.headers.get('access-control-allow-methods')).toBe('POST')
  expect(response.headers.get('access-control-allow-headers')).toBe('Authorization')
  expect(upstream).not.toHaveBeenCalled()
})

it('rejects foreign origins, missing origins, and nonempty requests before contacting ElevenLabs', async () => {
  await listen()
  const foreign = await fetch(endpoint, { method: 'POST', headers: { origin: `${origin}.invalid` } })
  expect(foreign.status).toBe(403)
  expect(foreign.headers.has('access-control-allow-origin')).toBe(false)

  const missingOrigin = await fetch(endpoint, { method: 'POST' })
  expect(missingOrigin.status).toBe(403)
  expect(missingOrigin.headers.has('access-control-allow-origin')).toBe(false)

  const withBody = await fetch(endpoint, { method: 'POST', headers: { origin }, body: '{}' })
  expect(withBody.status).toBe(400)
  expect(upstream).not.toHaveBeenCalled()
})

it.each([
  [401, 502],
  [429, 429],
])('maps upstream HTTP %i to %i without returning upstream details', async (status, expected) => {
  await listen()
  upstream.mockResolvedValueOnce(new Response(env.ELEVENLABS_API_KEY, { status }))
  const response = await fetch(endpoint, { method: 'POST', headers: { origin } })
  expect(response.status).toBe(expected)
  expect(await response.text()).not.toContain(env.ELEVENLABS_API_KEY)
})

it('reports unavailable service after a network error without returning the exception', async () => {
  await listen()
  upstream.mockRejectedValueOnce(new Error(env.ELEVENLABS_API_KEY))
  const response = await fetch(endpoint, { method: 'POST', headers: { origin } })
  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({ error: 'Voice service unavailable.' })
})

it('requires service credentials and exact configured origins', () => {
  expect(() => createVoiceServer({ env: {} })).toThrow('ELEVENLABS_API_KEY')
  expect(() => createVoiceServer({ env: { ...env, BEYT_VOICE_ORIGINS: '*' } })).toThrow('exact HTTP or HTTPS origins')
})
