import { expect, it } from 'vitest'
import { dailyPoemIndex } from './dailyPoems.js'

it('rotates by local calendar date, including across the epoch boundary', () => {
  expect(dailyPoemIndex(new Date(1969, 11, 31, 23, 59), 28)).toBe(27)
  expect(dailyPoemIndex(new Date(1970, 0, 1), 28)).toBe(0)
  expect(dailyPoemIndex(new Date(1970, 0, 1, 23, 59), 28)).toBe(0)
  expect(dailyPoemIndex(new Date(1970, 0, 2), 28)).toBe(1)
})
