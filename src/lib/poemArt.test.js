import { describe, expect, it } from 'vitest'
import { poemArt } from './poemArt.js'

describe('poemArt', () => {
  it('uses the same artwork for numeric and string IDs', () => {
    expect(poemArt('2130')).toEqual(poemArt(2130))
    expect(poemArt(2130).scene).toBe('river')
    expect(poemArt(2132).scene).toBe('garden')
  })

  it('rejects invalid IDs', () => {
    for (const id of [undefined, null, true, [], '', '0', ' 2130', '1e3', '0xff', '2\n', 0, -1, 1.5, NaN, Infinity, 2 ** 53]) {
      expect(poemArt(id)).toBeNull()
    }
  })

  it('omits art for poems outside the popular selection', () => {
    expect(poemArt(2131)).toBeNull()
    expect(poemArt('2625')).toBeNull()
    expect(poemArt(146929)).toBeNull()
  })
})
