export function pilotTokenUrl(value) {
  if (!value) return ''
  try {
    const endpoint = new URL(value)
    const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname)
    if (endpoint.username || endpoint.password || endpoint.hash) return ''
    if (endpoint.protocol === 'https:' || (loopback && endpoint.protocol === 'http:')) return endpoint.href
  } catch {}
  return ''
}
