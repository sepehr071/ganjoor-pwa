import { execFile } from 'node:child_process'
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

const localOrigins = 'https://localhost,http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173'
const run = promisify(execFile)

async function localToken(agentId) {
  const args = ['agents', 'conversations', 'get_webrtc_token', '--agent-id', agentId, '--format', 'json']
  const windows = process.platform === 'win32'
  const { stdout } = await run(windows ? 'cmd.exe' : 'elevenlabs', windows ? ['/d', '/c', 'elevenlabs', ...args] : args, {
    timeout: 15_000,
    windowsHide: true,
  })
  return new Response(stdout)
}

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(body))
}

export function createVoiceServer({ env = process.env, fetchUpstream = fetch } = {}) {
  const { ELEVENLABS_API_KEY: key, ELEVENLABS_AGENT_ID: agentId } = env
  const localOAuth = !key?.trim() && env.BEYT_VOICE_LOCAL_OAUTH === '1'
  const host = env.BEYT_VOICE_HOST || env.HOST || '127.0.0.1'
  if (localOAuth && host !== '127.0.0.1') throw new Error('Local ElevenLabs OAuth requires a 127.0.0.1 bind.')
  if ((!key?.trim() && !localOAuth) || !/^agent_[a-z0-9]+$/.test(agentId ?? '')) {
    throw new Error('Set ELEVENLABS_AGENT_ID and either ELEVENLABS_API_KEY or BEYT_VOICE_LOCAL_OAUTH=1.')
  }

  const allowedOrigins = new Set((env.BEYT_VOICE_ORIGINS || localOrigins).split(',').map((entry) => entry.trim()))
  for (const origin of allowedOrigins) {
    if (!URL.canParse(origin) || !/^https?:\/\//.test(origin) || new URL(origin).origin !== origin) {
      throw new Error('BEYT_VOICE_ORIGINS must contain exact HTTP or HTTPS origins.')
    }
  }

  const tokenUrl = new URL('https://api.elevenlabs.io/v1/convai/conversation/token')
  tokenUrl.searchParams.set('agent_id', agentId)

  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Vary', 'Origin')

    const { origin } = request.headers
    if (origin !== undefined) {
      if (!allowedOrigins.has(origin)) return json(response, 403, { error: 'Origin not allowed.' })
      response.setHeader('Access-Control-Allow-Origin', origin)
    }

    if (request.url !== '/voice/token') return json(response, 404, { error: 'Not found.' })
    if (request.method === 'OPTIONS' && origin) {
      response.writeHead(204, {
        'Access-Control-Allow-Methods': 'POST',
        // Older apps still send this header.
        'Access-Control-Allow-Headers': 'Authorization',
      })
      return response.end()
    }
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST, OPTIONS')
      return json(response, 405, { error: 'Method not allowed.' })
    }
    if (!origin) return json(response, 403, { error: 'Origin not allowed.' })
    if (Number(request.headers['content-length']) > 0 || request.headers['transfer-encoding']) {
      return json(response, 400, { error: 'This endpoint accepts an empty request body.' })
    }

    try {
      const upstream = localOAuth ? await localToken(agentId) : await fetchUpstream(tokenUrl, {
        headers: { 'xi-api-key': key },
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
      })
      if (!upstream.ok) {
        await upstream.body?.cancel()
        if (upstream.status === 429) return json(response, 429, { error: 'Voice session limit reached.' })
        return json(response, 502, { error: 'Voice service unavailable.' })
      }

      const { token } = await upstream.json()
      if (typeof token === 'string' && token.trim()) return json(response, 200, { token })
    } catch {
      return json(response, 503, { error: 'Voice service unavailable.' })
    }
    return json(response, 502, { error: 'Voice service unavailable.' })
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const host = process.env.BEYT_VOICE_HOST || process.env.HOST || '127.0.0.1'
  const port = Number(process.env.BEYT_VOICE_PORT || process.env.PORT || 8787)
  createVoiceServer().listen(port, host, () => {
    console.log(`Beyt voice token service listening on ${host}:${port}`)
  })
}
