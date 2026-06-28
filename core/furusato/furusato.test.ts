import { describe, it, expect } from 'vitest'
import { furusatoLimit, furusatoActual, marginalIncomeTaxRate } from './furusato'
import { calculateTakeHome } from '../takeHome'
import { getTaxTable } from '@data/taxTables/index'

describe('所得税の限界税率', () => {
  const table = getTaxTable()
  it('課税所得のブラケットに応じた税率', () => {
    expect(marginalIncomeTaxRate(0, table)).toBe(0)
    expect(marginalIncomeTaxRate(1_949_000, table)).toBe(0.05)
    expect(marginalIncomeTaxRate(1_950_000, table)).toBe(0.1)
    expect(marginalIncomeTaxRate(7_000_000, table)).toBe(0.23)
    expect(marginalIncomeTaxRate(50_000_000, table)).toBe(0.45)
  })
})

describe('ふるさと納税 控除上限額', () => {
  it('年収500万・単身（住民税所得割238,200・限界税率10%）', () => {
    const r = furusatoLimit({ salaryIncome: 5_000_000, age: 30 })
    // 238,200×0.2/(0.9−0.1×1.021)=47,640/0.7979=59,706.7 → +2,000 = 61,706
    expect(r.residentTaxIncomePortion).toBe(238_200)
    expect(r.marginalIncomeTaxRate).toBe(0.1)
    expect(r.limit).toBe(61_706)
    expect(r.selfBurden).toBe(2_000)
  })

  it('住民税所得割が0（低所得）なら上限0', () => {
    const r = furusatoLimit({ salaryIncome: 900_000, age: 25 })
    expect(r.residentTaxIncomePortion).toBe(0)
    expect(r.limit).toBe(0)
  })

  it('年収が上がると上限も増える', () => {
    const incomes = [3_000_000, 5_000_000, 8_000_000, 12_000_000]
    const limits = incomes.map((s) => furusatoLimit({ salaryIncome: s, age: 30 }).limit)
    for (let i = 1; i < limits.length; i++) {
      expect(limits[i]).toBeGreaterThan(limits[i - 1])
    }
  })

  it('配偶者控除があると住民税所得割が下がり上限も下がる', () => {
    const single = furusatoLimit({ salaryIncome: 6_000_000, age: 35 })
    const withSpouse = furusatoLimit({ salaryIncome: 6_000_000, age: 35, spouse: { salaryIncome: 0 } })
    expect(withSpouse.limit).toBeLessThan(single.limit)
  })

  it('住宅ローン控除（税額控除）は上限を変えない（特例控除20%の基礎は税額控除前）', () => {
    const base = { salaryIncome: 6_000_000, age: 35 }
    const without = furusatoLimit(base)
    const withLoan = furusatoLimit({
      ...base,
      housingLoan: { moveInYear: 2024, construction: 'new', performance: 'certified', yearEndBalance: 30_000_000 },
    })
    expect(withLoan.limit).toBe(without.limit)
  })

  it('iDeCo等の所得控除は課税所得・住民税所得割を下げ上限も下がる', () => {
    const base = { salaryIncome: 6_000_000, age: 35 }
    const without = furusatoLimit(base)
    const withIdeco = furusatoLimit({ ...base, idecoAnnual: 276_000 })
    expect(withIdeco.limit).toBeLessThan(without.limit)
  })
})

describe('ふるさと納税 実績シミュレーション（次年度住民税）', () => {
  const table = getTaxTable()
  // 年収500万・単身（住民税所得割238,200・限界税率10%・上限61,706）
  const result = calculateTakeHome({ salaryIncome: 5_000_000, age: 30 })

  it('上限内（6.1万円）: 3階建て控除・実質負担約2,000円', () => {
    const a = furusatoActual(result, 61_000, table)
    expect(a.withinLimit).toBe(true)
    expect(a.residentSpecialCapped).toBe(false)
    // 所得税(59,000×10%×1.021)、住民税基本(59,000×10%)、特例(59,000×(0.9−0.1021))
    expect(a.incomeTaxCredit).toBe(6_023)
    expect(a.residentBasicCredit).toBe(5_900)
    expect(a.residentSpecialCredit).toBe(47_076)
    expect(a.totalCreditFiling).toBe(58_999)
    expect(a.selfBurdenFiling).toBe(2_001)
    // ワンストップの申告特例控除（特例×割合の切上げ）。上限内なら自己負担はほぼ2,000円
    expect(a.declarationSpecialCredit).toBe(6_024)
    expect(a.selfBurdenOneStop).toBe(2_000)
  })

  it('上限内: 翌年度住民税は ワンストップ＝全額／確定申告＝基本＋特例 だけ下がる', () => {
    const a = furusatoActual(result, 61_000, table)
    expect(a.residentControlFiling).toBe(52_976) // 基本5,900＋特例47,076
    expect(a.residentControlOneStop).toBe(59_000) // ＋申告特例6,024
    expect(a.residentTaxBefore).toBeGreaterThan(0)
    expect(a.residentTaxAfterFiling).toBe(a.residentTaxBefore - 52_976)
    expect(a.residentTaxAfterOneStop).toBe(a.residentTaxBefore - 59_000)
    // 上限内ではワンストップの方が住民税は多く下がる（所得税分も住民税から）
    expect(a.residentTaxAfterOneStop).toBeLessThan(a.residentTaxAfterFiling)
  })

  it('上限超過（10万円）: 特例控除が20%上限・ワンストップは確定申告より不利', () => {
    const a = furusatoActual(result, 100_000, table)
    expect(a.residentSpecialCapped).toBe(true)
    expect(a.withinLimit).toBe(false)
    expect(a.residentSpecialCredit).toBe(47_640) // 238,200×20%
    // 申告特例控除も20%上限に連動して頭打ち → ワンストップの方が控除が小さく自己負担が大きい
    expect(a.selfBurdenFiling).toBe(32_555)
    expect(a.selfBurdenOneStop).toBe(36_463)
    expect(a.selfBurdenOneStop).toBeGreaterThan(a.selfBurdenFiling)
  })

  it('寄附額0なら控除なし・住民税は変わらない', () => {
    const a = furusatoActual(result, 0, table)
    expect(a.totalCreditFiling).toBe(0)
    expect(a.totalCreditOneStop).toBe(0)
    expect(a.withinLimit).toBe(false)
    expect(a.residentTaxAfterOneStop).toBe(a.residentTaxBefore)
    expect(a.residentTaxAfterFiling).toBe(a.residentTaxBefore)
  })

  it('確定申告: 控除総額＝所得税＋住民税基本＋特例、自己負担＝寄附−控除総額', () => {
    const a = furusatoActual(result, 61_000, table)
    expect(a.totalCreditFiling).toBe(a.incomeTaxCredit + a.residentBasicCredit + a.residentSpecialCredit)
    expect(a.selfBurdenFiling).toBe(a.donation - a.totalCreditFiling)
  })
})
