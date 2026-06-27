import { describe, it, expect } from 'vitest'
import { floorTo, ceilTo, floorTo1000, floorTo100 } from './rounding'

describe('floorTo', () => {
  it('指定単位の倍数に切り捨てる', () => {
    expect(floorTo(1_234_567, 1000)).toBe(1_234_000)
    expect(floorTo(199, 100)).toBe(100)
    expect(floorTo(100, 100)).toBe(100)
  })

  it('0 はそのまま', () => {
    expect(floorTo(0, 1000)).toBe(0)
  })

  it('unit が 0 以下なら例外', () => {
    expect(() => floorTo(100, 0)).toThrow(RangeError)
    expect(() => floorTo(100, -10)).toThrow(RangeError)
  })
})

describe('ceilTo', () => {
  it('指定単位の倍数に切り上げる', () => {
    expect(ceilTo(1_234_001, 1000)).toBe(1_235_000)
    expect(ceilTo(100, 100)).toBe(100)
    expect(ceilTo(101, 100)).toBe(200)
  })
})

describe('税制用エイリアス', () => {
  it('課税標準は1000円未満切捨て', () => {
    expect(floorTo1000(2_345_678)).toBe(2_345_000)
  })

  it('税額は100円未満切捨て', () => {
    expect(floorTo100(123_456)).toBe(123_400)
  })
})
