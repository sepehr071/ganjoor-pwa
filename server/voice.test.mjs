import { once } from 'node:events'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createVoiceServer } from './voice.mjs'

const env = {
  ELEVENLABS_API_KEY: 'test-workspace-key',
  ELEVENLABS_AGENT_ID: 'agent_pilot',
  BEYT_VOICE_ACCESS_CODE: 'test-pilot-code',
}
const origin = 'https://localhost'
const authorization = `Bearer ${env.BEYT_VOICE_ACCESS_CODE}`
let server, endpoint, upstream

it('rejects using local CLI credentials on a non-loopback bind', () => {
  expect(() => createVoiceServer({
    env: { ...env, ELEVENLABS_API_KEY: '', BEYT_VOICE_LOCAL_OAUTH: '1', BEYT_VOICE_HOST: '0.0.0.0' },
  })).toThrow('127.0.0.1')
})

beforeEach(async () => {
  upstream = vi.fn().mockResolvedValue(Response.json({ token: 'session-token', conversation_id: 'internal-id' }))
  server = createVoiceServer({ env, fetchUpstream: upstream }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  endpoint = `http://127.0.0.1:${server.address().port}/voice/token`
})

afterEach(async () => {
  if (server?.listening) {
    server.close()
    await once(server, 'close')
  }
})

it('returns an uncached token in the workspace default environment to the authorized client', async () => {
  const response = await fetch(endpoint, { method: 'POST', headers: { origin, authorization } })
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(response.headers.get('access-control-allow-origin')).toBe(origin)
  expect(await response.json()).toEqual({ token: 'session-token' })
  const [url, options] = upstream.mock.calls[0]
  expect(url.href).toBe('https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=agent_pilot')
  expect(options.headers).toEqual({ 'xi-api-key': env.ELEVENLABS_API_KEY })
  expect(options.redirect).toBe('error')
})

it('allows a Vite browser preflight without issuing a token', async () => {
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

it('rejects foreign origins, unauthorized requests, and nonempty requests before contacting ElevenLabs', async () => {
  const foreign = await fetch(endpoint, { method: 'POST', headers: { origin: `${origin}.invalid`, authorization } })
  expect(foreign.status).toBe(403)
  expect(foreign.headers.has('access-control-allow-origin')).toBe(false)

  const wrongCode = await fetch(endpoint, { method: 'POST', headers: { origin, authorization: 'Bearer wrong' } })
  expect(wrongCode.status).toBe(401)
  expect(wrongCode.headers.get('access-control-allow-origin')).toBe(origin)

  const withBody = await fetch(endpoint, { method: 'POST', headers: { origin, authorization }, body: '{}' })
  expect(withBody.status).toBe(400)
  expect(upstream).not.toHaveBeenCalled()
})

it.each([
  [401, 502],
  [429, 429],
])('maps upstream HTTP %i to %i without returning upstream details', async (status, expected) => {
  upstream.mockResolvedValueOnce(new Response(env.ELEVENLABS_API_KEY, { status }))
  const response = await fetch(endpoint, { method: 'POST', headers: { origin, authorization } })
  expect(response.status).toBe(expected)
  expect(await response.text()).not.toContain(env.ELEVENLABS_API_KEY)
})

it('reports unavailable service after a network error without returning the exception', async () => {
  upstream.mockRejectedValueOnce(new Error(env.ELEVENLABS_API_KEY))
  const response = await fetch(endpoint, { method: 'POST', headers: { origin, authorization } })
  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({ error: 'Voice service unavailable.' })
})

it('requires service credentials and exact configured origins', () => {
  expect(() => createVoiceServer({ env: {} })).toThrow('ELEVENLABS_API_KEY')
  expect(() => createVoiceServer({ env: { ...env, BEYT_VOICE_ORIGINS: '*' } })).toThrow('exact HTTP or HTTPS origins')
})
