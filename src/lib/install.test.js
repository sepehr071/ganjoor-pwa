import { describe, expect, it, vi } from 'vitest'

vi.mock('./native.js', () => ({ isNative: false }))
const { isIOS, APK_URL } = await import('./install.js')

describe('install', () => {
  it('detects iPhone, iPad and iPadOS posing as a Mac', () => {
    expect(isIOS('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5)).toBe(true)
    expect(isIOS('Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)', 5)).toBe(true)
    expect(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true)
  })

  it('does not treat a desktop Mac or Android as iOS', () => {
    expect(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false)
    expect(isIOS('Mozilla/5.0 (Linux; Android 15; Pixel 9)', 5)).toBe(false)
  })

  it('points at the newest release APK', () => {
    expect(APK_URL).toMatch(/\/releases\/latest\/download\/ganjoor-proposal-debug\.apk$/)
  })
})
