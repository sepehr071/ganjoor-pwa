import { describe, expect, it } from 'vitest'
import { pageTitle, SITE_NAME } from './hooks.js'

describe('pageTitle', () => {
  it('puts the page first and the proposal name after', () => {
    expect(pageTitle('فال حافظ')).toBe('فال حافظ | گنجور (پیشنهادی)')
  })
  it('uses the full name on the home page', () => {
    expect(pageTitle('')).toBe(SITE_NAME)
    expect(pageTitle(undefined)).toBe('گنجور — نسخهٔ پیشنهادی')
  })
})
