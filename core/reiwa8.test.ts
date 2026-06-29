import { describe, it, expect } from 'vitest'
import { getTaxTable } from '@data/taxTables/index'
import { socialInsurance } from './insurance/socialInsurance'
import { lifeInsuranceDeduction } from './deductions/extraDeductions'
import { housingLoanLimit } from './deductions/housingLoan'
import { calculateTakeHome } from './takeHome'

const table2026 = getTaxTable(2026)

describe('令和8年（2026）社会保険料', () => {
  it('健保に子ども・子育て支援金0.23%を含む／介護1.62%／雇用5/1000', () => {
    const r = socialInsurance(5_000_000, 30, table2026)
    // 標準報酬41万。健保(9.85%+0.23%)/2=5.04% → 20,664 ×12
    expect(r.health).toBe(247_968)
    expect(r.pension).toBe(450_180)
    expect(r.employment).toBe(25_000) // 500万×0.5%
  })
  it('40〜64歳は介護1.62%が加算', () => {
    const young = socialInsurance(5_000_000, 30, table2026)
    const middle = socialInsurance(5_000_000, 50, table2026)
    expect(middle.longTermCare).toBeGreaterThan(0)
    expect(middle.total).toBe(young.total + middle.longTermCare)
  })
})

describe('令和8年 生命保険料控除の子育て拡充（一般・新・所得税6万円）', () => {
  it('子育て世帯は一般生命保険(新)の所得税が拡充される', () => {
    const normal = lifeInsuranceDeduction({ general: { newAmount: 100_000 } }, 'incomeTax', table2026)
    const childcare = lifeInsuranceDeduction({ general: { newAmount: 100_000 }, childcareHousehold: true }, 'incomeTax', table2026)
    expect(normal).toBe(40_000) // 通常は4万円上限
    expect(childcare).toBe(55_000) // 10万×1/4+3万
  })
  it('120,000円超は上限6万円', () => {
    expect(lifeInsuranceDeduction({ general: { newAmount: 200_000 }, childcareHousehold: true }, 'incomeTax', table2026)).toBe(60_000)
  })
  it('住民税は拡充なし（28,000円のまま）', () => {
    expect(lifeInsuranceDeduction({ general: { newAmount: 100_000 }, childcareHousehold: true }, 'residentTax', table2026)).toBe(28_000)
  })
})

describe('令和8年入居の住宅ローン控除 借入限度額', () => {
  const cfg = table2026.housingLoan!
  it('新築（通常／子育て）', () => {
    expect(housingLoanLimit({ moveInYear: 2026, construction: 'new', performance: 'certified', yearEndBalance: 0 }, cfg)).toBe(45_000_000)
    expect(housingLoanLimit({ moveInYear: 2026, construction: 'new', performance: 'energySaving', yearEndBalance: 0 }, cfg)).toBe(20_000_000)
    expect(housingLoanLimit({ moveInYear: 2026, construction: 'new', performance: 'certified', childcareHousehold: true, yearEndBalance: 0 }, cfg)).toBe(50_000_000)
  })
  it('中古は令和8で引上げ＋子育て上乗せ', () => {
    expect(housingLoanLimit({ moveInYear: 2026, construction: 'used', performance: 'certified', yearEndBalance: 0 }, cfg)).toBe(35_000_000)
    expect(housingLoanLimit({ moveInYear: 2026, construction: 'used', performance: 'certified', childcareHousehold: true, yearEndBalance: 0 }, cfg)).toBe(45_000_000)
    expect(housingLoanLimit({ moveInYear: 2026, construction: 'used', performance: 'other', yearEndBalance: 0 }, cfg)).toBe(20_000_000)
  })
  it('令和4〜7入居は令和7と同じ（再利用）', () => {
    expect(housingLoanLimit({ moveInYear: 2024, construction: 'new', performance: 'certified', yearEndBalance: 0 }, cfg)).toBe(45_000_000)
    expect(housingLoanLimit({ moveInYear: 2023, construction: 'used', performance: 'certified', yearEndBalance: 0 }, cfg)).toBe(30_000_000)
  })
})

describe('令和8年で calculateTakeHome が動く', () => {
  it('taxYear:2026 で年度が解決され社保が令和8料率になる', () => {
    const r2025 = calculateTakeHome({ salaryIncome: 5_000_000, age: 30, taxYear: 2025 })
    const r2026 = calculateTakeHome({ salaryIncome: 5_000_000, age: 30, taxYear: 2026 })
    expect(r2026.taxYear).toBe(2026)
    expect(r2026.socialInsurance.total).not.toBe(r2025.socialInsurance.total)
  })
})

// 令和8年度税制改正（令和8年12月1日施行・令和8年分以後）。基礎控除62万本則＋特例、給与所得控除74万。
// 出典: 国税庁「令和8年4月源泉所得税の改正のあらまし」、財務省 令和8年度税制改正。
describe('令和8改正の所得税（基礎控除・給与所得控除・178万円の壁）', () => {
  it('年収500万・単身: 基礎控除104万で課税所得が下がり所得税が減る', () => {
    const r = calculateTakeHome({ salaryIncome: 5_000_000, age: 30, taxYear: 2026 })
    expect(r.incomeTaxDeductions.basic).toBe(1_040_000) // 合計所得356万→104万（令和7は68万）
    expect(r.taxableForIncomeTax).toBe(1_796_000) // 5%帯（令和7は2,158,000で10%帯）
    expect(r.incomeTax).toBe(91_600) // 1,796,000×5%×1.021（令和7は120,700）
    expect(r.residentTax).toBe(243_000) // 住民税基礎控除は43万で据置
    expect(r.takeHome).toBe(3_942_252)
  })

  it('給与所得控除の最低保障74万（年収220万まで）', () => {
    const r = calculateTakeHome({ salaryIncome: 2_200_000, age: 30, taxYear: 2026 })
    expect(r.employmentIncome).toBe(2_200_000 - 740_000) // 給与所得＝収入−74万
  })

  it('178万円の壁: 給与収入178万・単身は課税所得0・所得税0', () => {
    const r = calculateTakeHome({ salaryIncome: 1_780_000, age: 30, taxYear: 2026 })
    expect(r.employmentIncome).toBe(1_040_000) // 178万−給与所得控除74万
    expect(r.taxableForIncomeTax).toBe(0) // 104万−基礎控除104万
    expect(r.incomeTax).toBe(0)
  })

  it('配偶者控除の所得要件が62万に（配偶者の給与収入136万まで配偶者控除）', () => {
    const table = getTaxTable(2026)
    expect(table.spouseDeductionIncomeLimit).toBe(620_000)
  })
})
