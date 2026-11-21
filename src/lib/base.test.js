import { afterEach, describe, expect, it, vi } from 'vitest'

const load = async (base) => {
  vi.stubEnv('BASE_URL', base)
  vi.resetModules()
  return import('./base.js')
}

afterEach(() => vi.unstubAllEnvs())

describe('base path', () => {
  it('is a no-op at the root', async () => {
    const { url, strip } = await load('/')
    expect(url('/poem/1')).toBe('/poem/1')
    expect(url('/')).toBe('/')
    expect(strip('/poem/1')).toBe('/poem/1')
  })

  it('adds and removes a subpath base', async () => {
    const { url, strip } = await load('/ganjoor-pwa/')
    expect(url('/poem/2130')).toBe('/ganjoor-pwa/poem/2130')
    expect(url('/')).toBe('/ganjoor-pwa/')
    expect(url('/search?q=x')).toBe('/ganjoor-pwa/search?q=x')
    expect(strip('/ganjoor-pwa/poem/2130')).toBe('/poem/2130')
    expect(strip('/ganjoor-pwa')).toBe('/')
    expect(strip('/ganjoor-pwa/')).toBe('/')
    expect(strip('/ganjoor-pwa?x=1')).toBe('/?x=1')
    expect(strip('/ganjoor-pwa/search?q=x')).toBe('/search?q=x')
    expect(strip('/ganjoor-pwa-other/x')).toBe('/ganjoor-pwa-other/x')
    expect(strip(url('/meters/12'))).toBe('/meters/12')
  })
})
