import { afterEach, expect, it, vi } from 'vitest'
import { App } from '@capacitor/app'
import { handleAndroidBack } from './native.js'

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
