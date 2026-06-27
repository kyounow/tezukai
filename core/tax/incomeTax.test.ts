import { describe, it, expect } from 'vitest'
import { baseIncomeTax, incomeTaxWithSurtax } from './incomeTax'

// 出典: 国税庁 No.2260（速算表）。公式例: 課税所得700万→700万×0.23−63.6万=974,000円
describe('所得税（基準所得税額）', () => {
  it('課税所得0や負は0', () => {
    expect(baseIncomeTax(0)).toBe(0)
    expect(baseIncomeTax(-100_000)).toBe(0)
  })

  it('課税所得は1,000円未満を切り捨ててから計算', () => {
    // 1,000,500 → 1,000,000 × 5% = 50,000
    expect(baseIncomeTax(1_000_500)).toBe(50_000)
  })

  it('公式例: 課税所得700万円→974,000円', () => {
    expect(baseIncomeTax(7_000_000)).toBe(974_000)
  })

  it('各区分の境界', () => {
    expect(baseIncomeTax(1_949_000)).toBe(97_450) // 5%
    expect(baseIncomeTax(1_950_000)).toBe(97_500) // 10%−97,500
    expect(baseIncomeTax(3_300_000)).toBe(232_500) // 20%−427,500
    expect(baseIncomeTax(40_000_000)).toBe(13_204_000) // 45%−4,796,000
  })
})

describe('復興特別所得税込みの所得税額（100円未満切捨て）', () => {
  it('課税所得700万円→994,400円', () => {
    // 974,000 ×1.021 = 994,454 → 100円未満切捨て → 994,400
    expect(incomeTaxWithSurtax(7_000_000)).toBe(994_400)
  })

  it('課税所得0は0', () => {
    expect(incomeTaxWithSurtax(0)).toBe(0)
  })
})
