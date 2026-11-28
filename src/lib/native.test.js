import { afterEach, expect, it, vi } from 'vitest'
import { App } from '@capacitor/app'
import { handleAndroidBack, widgetLinkPath } from './native.js'

vi.mock('@capacitor/app', () => ({ App: { exitApp: vi.fn() } }))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('dismisses the open sheet before exiting Android from the home page', () => {
  const sheet = { close: vi.fn() }
  vi.stubGlobal('document', { querySelector: () => sheet })
  vi.stubGlobal('location', { pathname: '/' })
  handleAndroidBack({ canGoBack: false })
  expect(sheet.close).toHaveBeenCalledOnce()
  expect(App.exitApp).not.toHaveBeenCalled()
})

it('opens the displayed poem or its exact widget couplet in the voice screen', () => {
  expect(widgetLinkPath('beyt://poem/2130')).toBe('/poem/2130')
  expect(widgetLinkPath('beyt://voice/2130')).toBe('/voice/2130?widget=1')
})

it('accepts only supported widget links and positive numeric IDs', () => {
  for (const link of ['https://voice/2130', 'beyt://unknown/2130', 'beyt://voice/0', 'beyt://voice/123?widget=1']) {
    expect(widgetLinkPath(link)).toBeNull()
  }
})
