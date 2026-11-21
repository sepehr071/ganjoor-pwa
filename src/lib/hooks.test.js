import { describe, expect, it } from 'vitest'
import { pageTitle, SITE_NAME } from './hooks.js'

describe('pageTitle', () => {
  it('puts the page first and the app name after', () => {
    expect(pageTitle('فال حافظ')).toBe('فال حافظ | بیت')
  })
  it('uses the full name on the home page', () => {
    expect(pageTitle('')).toBe(SITE_NAME)
    expect(pageTitle(undefined)).toBe('بیت: شعر فارسی بر پایهٔ گنجور')
  })
})
