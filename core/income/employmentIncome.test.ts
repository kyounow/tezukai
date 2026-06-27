import { describe, it, expect } from 'vitest'
import { employmentIncome, employmentIncomeDeduction } from './employmentIncome'

// 令和7年分（最低保障65万円）。出典: 国税庁 No.1410
describe('給与所得控除（令和7年分）', () => {
  it('収入0は控除0', () => {
    expect(employmentIncomeDeduction(0)).toBe(0)
  })

  it('低収入では控除は収入が上限（給与所得は0）', () => {
    expect(employmentIncomeDeduction(600_000)).toBe(600_000)
    expect(employmentIncome(600_000)).toBe(0)
  })

  it('190万まで＝最低保障65万円', () => {
    expect(employmentIncomeDeduction(1_900_000)).toBe(650_000)
    expect(employmentIncome(1_900_000)).toBe(1_250_000)
  })

  it('190万超〜360万＝収入×30%+8万', () => {
    expect(employmentIncomeDeduction(2_000_000)).toBe(680_000)
    expect(employmentIncome(2_000_000)).toBe(1_320_000)
  })

  it('360万超〜660万＝収入×20%+44万（年収500万→給与所得356万）', () => {
    expect(employmentIncomeDeduction(5_000_000)).toBe(1_440_000)
    expect(employmentIncome(5_000_000)).toBe(3_560_000)
  })

  it('660万境界＝収入×20%+44万', () => {
    expect(employmentIncomeDeduction(6_600_000)).toBe(1_760_000)
    expect(employmentIncome(6_600_000)).toBe(4_840_000)
  })

  it('660万超〜850万＝収入×10%+110万', () => {
    expect(employmentIncomeDeduction(8_500_000)).toBe(1_950_000)
    expect(employmentIncome(8_500_000)).toBe(6_550_000)
  })

  it('850万超＝上限195万円', () => {
    expect(employmentIncomeDeduction(10_000_000)).toBe(1_950_000)
    expect(employmentIncome(10_000_000)).toBe(8_050_000)
    expect(employmentIncomeDeduction(20_000_000)).toBe(1_950_000)
  })
})
