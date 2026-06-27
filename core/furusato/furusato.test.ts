import { describe, it, expect } from 'vitest'
import { furusatoLimit, marginalIncomeTaxRate } from './furusato'
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
})
