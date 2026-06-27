import { describe, it, expect } from 'vitest'
import { calculateTakeHome } from './takeHome'

describe('年収→手取り（統合・令和7年）', () => {
  it('年収500万・単身・30歳（全段を手計算で検証）', () => {
    const r = calculateTakeHome({ salaryIncome: 5_000_000, age: 30 })

    // 給与所得控除 1,440,000 → 給与所得 3,560,000
    expect(r.employmentIncome).toBe(3_560_000)

    // 社会保険料（本人・年額）
    expect(r.socialInsurance.total).toBe(732_752)

    // 所得税: 課税所得 = floor1000(3,560,000 − (680,000基礎 + 732,752社保)) = 2,147,000
    expect(r.taxableForIncomeTax).toBe(2_147_000)
    // 117,200 ×1.021 = 119,661.2 → 119,600
    expect(r.incomeTax).toBe(119_600)

    // 住民税: 課税標準 = floor1000(3,560,000 − (430,000基礎 + 732,752社保)) = 2,397,000
    expect(r.taxableForResidentTax).toBe(2_397_000)
    // 所得割237,100 + 均等割4,000 + 森林環境税1,000
    expect(r.residentTaxDetail.incomePortion).toBe(237_100)
    expect(r.residentTax).toBe(242_100)

    expect(r.totalBurden).toBe(119_600 + 242_100 + 732_752)
    expect(r.takeHome).toBe(3_905_548)
  })

  it('内訳の整合性（手取り = 年収 − 所得税 − 住民税 − 社保）', () => {
    const r = calculateTakeHome({ salaryIncome: 7_000_000, age: 42 })
    expect(r.totalBurden).toBe(r.incomeTax + r.residentTax + r.socialInsurance.total)
    expect(r.takeHome).toBe(r.salaryIncome - r.totalBurden)
    expect(r.takeHome).toBeLessThan(r.salaryIncome)
    expect(r.totalBurden).toBeGreaterThan(0)
  })

  it('配偶者控除で所得税・住民税が下がる', () => {
    const single = calculateTakeHome({ salaryIncome: 6_000_000, age: 35 })
    const withSpouse = calculateTakeHome({
      salaryIncome: 6_000_000,
      age: 35,
      spouse: { salaryIncome: 0 },
    })
    expect(withSpouse.incomeTax).toBeLessThan(single.incomeTax)
    expect(withSpouse.residentTax).toBeLessThan(single.residentTax)
    expect(withSpouse.takeHome).toBeGreaterThan(single.takeHome)
  })

  it('低収入は所得税0・住民税非課税', () => {
    const r = calculateTakeHome({ salaryIncome: 900_000, age: 25 })
    expect(r.incomeTax).toBe(0)
    expect(r.residentTax).toBe(0)
    expect(r.takeHome).toBeLessThan(r.salaryIncome) // 社保は発生
  })

  it('年収が上がると手取りも増える（単調性）', () => {
    const incomes = [3_000_000, 5_000_000, 8_000_000, 12_000_000]
    const takeHomes = incomes.map((s) => calculateTakeHome({ salaryIncome: s, age: 30 }).takeHome)
    for (let i = 1; i < takeHomes.length; i++) {
      expect(takeHomes[i]).toBeGreaterThan(takeHomes[i - 1])
    }
  })

  it('年少扶養（16歳未満）は扶養控除0だが住民税の非課税判定に効く', () => {
    // 低所得世帯: 16歳未満の子が増えると非課税限度額が上がり住民税が非課税に
    const withoutKids = calculateTakeHome({ salaryIncome: 1_500_000, age: 30 })
    const withKids = calculateTakeHome({
      salaryIncome: 1_500_000,
      age: 30,
      dependents: { under16: 2 },
    })
    expect(withoutKids.residentTax).toBeGreaterThan(0)
    expect(withKids.residentTax).toBe(0)
  })

  it('年少扶養は通常所得では税額を変えない（扶養控除0のため）', () => {
    const base = calculateTakeHome({ salaryIncome: 5_000_000, age: 30 })
    const withKids = calculateTakeHome({
      salaryIncome: 5_000_000,
      age: 30,
      dependents: { under16: 2 },
    })
    expect(withKids.incomeTax).toBe(base.incomeTax)
    expect(withKids.residentTax).toBe(base.residentTax)
  })

  it('40〜64歳は介護保険分だけ手取りが減る', () => {
    const young = calculateTakeHome({ salaryIncome: 5_000_000, age: 30 })
    const middle = calculateTakeHome({ salaryIncome: 5_000_000, age: 50 })
    expect(middle.socialInsurance.longTermCare).toBeGreaterThan(0)
    expect(young.socialInsurance.longTermCare).toBe(0)
    expect(middle.takeHome).toBeLessThan(young.takeHome)
  })
})
