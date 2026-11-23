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

  it('shares through the Pages entry document and preserves the couplet anchor', async () => {
    const { sharedLink, sharedPath } = await load('/ganjoor-pwa/')
    const origin = 'https://sepehr071.github.io'
    const link = new URL(sharedLink(`${origin}/ganjoor-pwa/poem/2130#b3`, origin))
    expect(link.pathname).toBe('/ganjoor-pwa/')
    expect(link.hash).toBe('#b3')
    expect(sharedPath('/', link.searchParams.get('read'))).toBe('/poem/2130')
    expect(sharedPath('/', '//example.net/poem/1')).toBe('/')
    expect(sharedPath('/search', '/poem/2130')).toBe('/search')
  })

  it('shares poems from the Android origin through the public site', async () => {
    const { sharedLink } = await load('/')
    expect(sharedLink('https://localhost/poet/2', 'https://localhost', true))
      .toBe('https://sepehr071.github.io/ganjoor-pwa/?read=%2Fpoet%2F2')
  })
})
