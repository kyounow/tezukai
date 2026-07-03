import { describe, it, expect } from 'vitest'
import {
  basicDeduction,
  spouseDeduction,
  dependentDeduction,
  specialRelativeDeduction,
} from './deductions'

describe('基礎控除（令和7年）', () => {
  it('所得税は合計所得で段階（令和7・8年分の時限上乗せ込み）', () => {
    expect(basicDeduction(1_000_000, 'incomeTax')).toBe(950_000) // ≤132万
    expect(basicDeduction(2_000_000, 'incomeTax')).toBe(880_000) // ≤336万
    expect(basicDeduction(5_000_000, 'incomeTax')).toBe(630_000) // ≤655万
    expect(basicDeduction(7_000_000, 'incomeTax')).toBe(580_000) // 本則
    expect(basicDeduction(24_200_000, 'incomeTax')).toBe(320_000)
    expect(basicDeduction(26_000_000, 'incomeTax')).toBe(0)
  })

  it('住民税は最大43万円（据え置き）', () => {
    expect(basicDeduction(5_000_000, 'residentTax')).toBe(430_000)
    expect(basicDeduction(24_200_000, 'residentTax')).toBe(290_000)
    expect(basicDeduction(26_000_000, 'residentTax')).toBe(0)
  })
})

describe('配偶者控除・配偶者特別控除', () => {
  it('配偶者の給与収入123万以下（合計所得58万以下）は配偶者控除', () => {
    // 本人所得400万、配偶者給与100万→合計所得35万 → 一般38万
    expect(spouseDeduction(4_000_000, 1_000_000, false, 'incomeTax')).toBe(380_000)
    expect(spouseDeduction(4_000_000, 1_000_000, false, 'residentTax')).toBe(330_000)
  })

  it('老人控除対象配偶者', () => {
    expect(spouseDeduction(4_000_000, 0, true, 'incomeTax')).toBe(480_000)
    expect(spouseDeduction(4_000_000, 0, true, 'residentTax')).toBe(380_000)
  })

  it('配偶者の給与収入150万（合計所得85万）は配偶者特別控除', () => {
    // 配偶者所得58万超95万以下 → 本人900万以下で38万
    expect(spouseDeduction(4_000_000, 1_500_000, false, 'incomeTax')).toBe(380_000)
    expect(spouseDeduction(4_000_000, 1_500_000, false, 'residentTax')).toBe(330_000)
  })

  it('本人の合計所得が高いほど控除が逓減（900万超/950万超）', () => {
    expect(spouseDeduction(9_300_000, 1_000_000, false, 'incomeTax')).toBe(260_000)
    expect(spouseDeduction(9_800_000, 1_000_000, false, 'incomeTax')).toBe(130_000)
  })

  it('本人の合計所得1000万円超は0', () => {
    expect(spouseDeduction(11_000_000, 1_000_000, false, 'incomeTax')).toBe(0)
  })

  it('配偶者の合計所得133万円ちょうど付近は配偶者特別控除（境界確認）', () => {
    // 給与収入200万→給与所得132万（=合計所得132万 ≤133万）→ 最終帯3万円
    expect(spouseDeduction(4_000_000, 2_000_000, false, 'incomeTax')).toBe(30_000)
  })

  it('配偶者の合計所得133万円超は0', () => {
    // 給与収入210万→給与所得139万 > 133万
    expect(spouseDeduction(4_000_000, 2_100_000, false, 'incomeTax')).toBe(0)
  })

  it('配偶者特別控除: バンド境界の遷移（±1円で正しい帯に切り替わる）', () => {
    // 給与収入≤190万は給与所得控除65万の速算式なので 合計所得＝給与収入−65万 が正確に成り立つ。
    // 配偶者控除→特別控除の境界（所得58万）: 控除額は同額38万のまま制度が切り替わる。
    expect(spouseDeduction(4_000_000, 1_230_000, false, 'incomeTax')).toBe(380_000) // 所得58万ちょうど＝配偶者控除
    expect(spouseDeduction(4_000_000, 1_230_001, false, 'incomeTax')).toBe(380_000) // 58万+1円＝特別控除の第1帯
    // 95万境界: 38万 → 36万
    expect(spouseDeduction(4_000_000, 1_600_000, false, 'incomeTax')).toBe(380_000) // 所得95万ちょうど
    expect(spouseDeduction(4_000_000, 1_600_001, false, 'incomeTax')).toBe(360_000) // 95万+1円
    // 100万境界: 36万 → 31万
    expect(spouseDeduction(4_000_000, 1_650_000, false, 'incomeTax')).toBe(360_000) // 所得100万ちょうど
    expect(spouseDeduction(4_000_000, 1_650_001, false, 'incomeTax')).toBe(310_000) // 100万+1円
    // 住民税は58万超〜100万が33万に統合されている帯: 100万ちょうどは33万、超えると下がる
    expect(spouseDeduction(4_000_000, 1_650_000, false, 'residentTax')).toBe(330_000)
    expect(spouseDeduction(4_000_000, 1_650_001, false, 'residentTax')).toBeLessThan(330_000)
  })
})

describe('扶養控除', () => {
  it('区分別人数で合算（所得税）', () => {
    expect(dependentDeduction({ general: 1, specified: 1 }, 'incomeTax')).toBe(1_010_000) // 38万+63万
    expect(dependentDeduction({ elderlyCoLiving: 1, elderlyOther: 1 }, 'incomeTax')).toBe(1_060_000) // 58万+48万
  })

  it('住民税', () => {
    expect(dependentDeduction({ specified: 2 }, 'residentTax')).toBe(900_000) // 45万×2
  })

  it('扶養なしは0', () => {
    expect(dependentDeduction({}, 'incomeTax')).toBe(0)
  })
})

describe('特定親族特別控除（令和7年新設）', () => {
  it('合計所得70万（58万超85万以下）は63万（所得税）/45万（住民税）', () => {
    expect(specialRelativeDeduction([700_000], 'incomeTax')).toBe(630_000)
    expect(specialRelativeDeduction([700_000], 'residentTax')).toBe(450_000)
  })

  it('58万円以下は対象外（扶養控除側）', () => {
    expect(specialRelativeDeduction([580_000], 'incomeTax')).toBe(0)
  })

  it('123万円超は0', () => {
    expect(specialRelativeDeduction([1_300_000], 'incomeTax')).toBe(0)
  })

  it('複数人を合算', () => {
    expect(specialRelativeDeduction([700_000, 1_000_000], 'incomeTax')).toBe(630_000 + 410_000)
  })
})
