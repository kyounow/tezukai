import { describe, it, expect } from 'vitest'
import { getTaxTable } from '@data/taxTables/index'
import { businessIncome, businessProfit } from './income/businessIncome'
import { nationalInsurance } from './insurance/nationalInsurance'
import { calculateTakeHome } from './takeHome'

const t2025 = getTaxTable(2025)

describe('事業所得（青色申告特別控除）', () => {
  it('収入−経費−青色控除（65万）', () => {
    const input = { revenue: 8_000_000, expenses: 3_000_000, blueDeduction: '65' as const }
    expect(businessProfit(input)).toBe(5_000_000)
    expect(businessIncome(input)).toBe(4_350_000)
  })
  it('白色は控除なし、55万・10万も区分どおり', () => {
    expect(businessIncome({ revenue: 5_000_000, expenses: 2_000_000 })).toBe(3_000_000) // 白色
    expect(businessIncome({ revenue: 5_000_000, expenses: 2_000_000, blueDeduction: '55' })).toBe(2_450_000)
    expect(businessIncome({ revenue: 5_000_000, expenses: 2_000_000, blueDeduction: '10' })).toBe(2_900_000)
  })
  it('赤字はそのまま（青色控除で赤字を作らない）', () => {
    expect(businessIncome({ revenue: 5_000_000, expenses: 5_500_000, blueDeduction: '65' })).toBe(-500_000)
  })
})

describe('国民年金＋国民健康保険（東京特別区・令和7）', () => {
  it('合計所得435万・30歳: 国民年金210,120＋国保(医療+支援)', () => {
    const r = nationalInsurance(4_350_000, 30, 1, t2025)
    // 旧ただし書き所得=435万−43万=392万。医療=floor(392万×7.71%)+47,300、支援=floor(392万×2.69%)+16,800
    expect(r.pension).toBe(210_120)
    expect(r.health).toBe(471_780)
    expect(r.longTermCare).toBe(0)
    expect(r.employment).toBe(0)
    expect(r.total).toBe(681_900)
  })
  it('40〜64歳は介護分が加算', () => {
    const r = nationalInsurance(4_350_000, 50, 1, t2025)
    expect(r.longTermCare).toBeGreaterThan(0)
  })
})

describe('個人事業主モードの手取り（統合）', () => {
  it('事業収入800万・経費300万・青色65万・30歳・単身', () => {
    const r = calculateTakeHome({
      mode: 'soleProprietor',
      taxYear: 2025,
      salaryIncome: 0,
      age: 30,
      business: { revenue: 8_000_000, expenses: 3_000_000, blueDeduction: '65' },
    })
    expect(r.mode).toBe('soleProprietor')
    expect(r.businessIncome).toBe(4_350_000)
    expect(r.grossIncome).toBe(5_000_000) // 収入−経費（青色控除前）
    expect(r.socialInsurance.total).toBe(681_900)
    expect(r.incomeTax).toBe(205_500)
    expect(r.residentTax).toBe(326_200)
    expect(r.takeHome).toBe(3_786_400)
  })

  it('青色控除を増やすと課税所得が下がり手取りが増える', () => {
    const base = { mode: 'soleProprietor' as const, taxYear: 2025 as const, salaryIncome: 0, age: 30 }
    const white = calculateTakeHome({ ...base, business: { revenue: 8_000_000, expenses: 3_000_000 } })
    const blue65 = calculateTakeHome({ ...base, business: { revenue: 8_000_000, expenses: 3_000_000, blueDeduction: '65' } })
    expect(blue65.incomeTax).toBeLessThan(white.incomeTax)
    expect(blue65.takeHome).toBeGreaterThan(white.takeHome)
  })
})
