import { describe, it, expect } from 'vitest'
import { getTaxTable } from '@data/taxTables/index'
import { calculateTakeHome } from './takeHome'

// 令和9年（2027）暫定。所得税は令和8改正と同構造（令和8・9年分共通）。
// 防衛特別所得税1%＋復興1.1%＝合算2.1%で負担不変（reconstructionSurtaxRate は 0.021 のまま）。
describe('令和9年（2027・暫定）', () => {
  it('暫定フラグが立っている', () => {
    expect(getTaxTable(2027).provisional).toBe(true)
    expect(getTaxTable(2026).provisional).toBeFalsy()
  })

  it('所得税の控除構造は令和8と同じ（基礎控除104万・給与所得控除74万）', () => {
    expect(getTaxTable(2027).basicDeduction.incomeTax).toEqual(getTaxTable(2026).basicDeduction.incomeTax)
    expect(getTaxTable(2027).employmentIncomeDeduction).toEqual(getTaxTable(2026).employmentIncomeDeduction)
    expect(getTaxTable(2027).spouseDeductionIncomeLimit).toBe(620_000)
  })

  it('付加税率は2.1%のまま（復興1.1%＋防衛1.0%。負担不変）', () => {
    expect(getTaxTable(2027).reconstructionSurtaxRate).toBe(0.021)
  })

  it('給与所得者の所得税・住民税は令和8と同額（社保も令和8流用）', () => {
    const r2026 = calculateTakeHome({ salaryIncome: 5_000_000, age: 30, taxYear: 2026 })
    const r2027 = calculateTakeHome({ salaryIncome: 5_000_000, age: 30, taxYear: 2027 })
    expect(r2027.taxYear).toBe(2027)
    expect(r2027.incomeTax).toBe(r2026.incomeTax)
    expect(r2027.residentTax).toBe(r2026.residentTax)
    expect(r2027.socialInsurance.total).toBe(r2026.socialInsurance.total)
  })

  it('個人事業主の国民年金は令和9確定額（年219,480円＝月18,290×12）', () => {
    const r = calculateTakeHome({
      mode: 'soleProprietor',
      salaryIncome: 0,
      age: 30,
      taxYear: 2027,
      business: { revenue: 5_000_000, expenses: 1_500_000, blueDeduction: '65' },
    })
    expect(r.socialInsurance.pension).toBe(219_480)
  })
})
