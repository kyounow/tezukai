import { describe, it, expect } from 'vitest'
import { housingLoanLimit, housingLoanAvailableCredit, isWithinHousingLoanPeriod } from './housingLoan'
import { getTaxTable } from '@data/taxTables/index'
import type { HousingLoanInput } from '../types'

const cfg = getTaxTable().housingLoan!

function input(p: Partial<HousingLoanInput> & Pick<HousingLoanInput, 'moveInYear' | 'construction' | 'performance'>): HousingLoanInput {
  return { yearEndBalance: 0, ...p }
}

describe('住宅ローン控除 借入限度額（入居年×区分×性能）', () => {
  it('新築・令和4入居', () => {
    expect(housingLoanLimit(input({ moveInYear: 2022, construction: 'new', performance: 'certified' }), cfg)).toBe(50_000_000)
    expect(housingLoanLimit(input({ moveInYear: 2022, construction: 'new', performance: 'other' }), cfg)).toBe(30_000_000)
  })
  it('新築・令和6入居（一般 vs 子育て世帯上乗せ）', () => {
    expect(housingLoanLimit(input({ moveInYear: 2024, construction: 'new', performance: 'certified' }), cfg)).toBe(45_000_000)
    expect(housingLoanLimit(input({ moveInYear: 2024, construction: 'new', performance: 'certified', childcareHousehold: true }), cfg)).toBe(50_000_000)
  })
  it('新築・その他は令和6・7は原則対象外（0）', () => {
    expect(housingLoanLimit(input({ moveInYear: 2025, construction: 'new', performance: 'other' }), cfg)).toBe(0)
  })
  it('中古は認定等3,000万・その他2,000万（年によらず）', () => {
    expect(housingLoanLimit(input({ moveInYear: 2023, construction: 'used', performance: 'certified' }), cfg)).toBe(30_000_000)
    expect(housingLoanLimit(input({ moveInYear: 2023, construction: 'used', performance: 'other' }), cfg)).toBe(20_000_000)
  })
})

describe('住宅ローン控除 控除可能額（年末残高×0.7%）', () => {
  it('残高が限度内: 残高×0.7%', () => {
    expect(housingLoanAvailableCredit(input({ moveInYear: 2024, construction: 'new', performance: 'certified', yearEndBalance: 40_000_000 }), 5_000_000)).toBe(280_000)
  })
  it('残高が限度超: 限度額×0.7%', () => {
    expect(housingLoanAvailableCredit(input({ moveInYear: 2024, construction: 'new', performance: 'certified', yearEndBalance: 50_000_000 }), 5_000_000)).toBe(315_000)
  })
  it('合計所得2,000万円超は適用なし', () => {
    expect(housingLoanAvailableCredit(input({ moveInYear: 2024, construction: 'new', performance: 'certified', yearEndBalance: 40_000_000 }), 25_000_000)).toBe(0)
  })
  it('対象外区分（限度0）は0', () => {
    expect(housingLoanAvailableCredit(input({ moveInYear: 2025, construction: 'new', performance: 'other', yearEndBalance: 30_000_000 }), 5_000_000)).toBe(0)
  })
})

describe('住宅ローン控除 控除期間（中古の13年化・令和8以降入居）', () => {
  // 令和8年度改正: 省エネ性能の高い既存住宅（認定/ZEH/省エネ基準適合）は控除期間を10年→13年へ拡充。
  // その他（省エネ基準なし）は10年のまま。出典: 財務省 令和8年度税制改正の大綱、国交省 報道発表。
  const cfg2026 = getTaxTable(2026).housingLoan!
  const cfg2025 = getTaxTable(2025).housingLoan!

  it('中古・省エネ基準適合・令和8入居は13年目まで有効（14年目から対象外）', () => {
    // 入居2026が1年目。13年目=令和20年(2038, elapsed 12)まで有効、14年目=2039は対象外。
    const p = input({ moveInYear: 2026, construction: 'used', performance: 'energySaving' })
    expect(isWithinHousingLoanPeriod(p, cfg2026, 2038)).toBe(true)
    expect(isWithinHousingLoanPeriod(p, cfg2026, 2039)).toBe(false)
  })
  it('中古・認定住宅・令和8入居も13年目まで有効', () => {
    const p = input({ moveInYear: 2026, construction: 'used', performance: 'certified' })
    expect(isWithinHousingLoanPeriod(p, cfg2026, 2038)).toBe(true)
    expect(isWithinHousingLoanPeriod(p, cfg2026, 2039)).toBe(false)
  })
  it('中古・その他（省エネ基準なし）・令和8入居は10年のまま（11年目から対象外）', () => {
    // 10年目=2035(elapsed 9)まで有効、11年目=2036は対象外。
    const p = input({ moveInYear: 2026, construction: 'used', performance: 'other' })
    expect(isWithinHousingLoanPeriod(p, cfg2026, 2035)).toBe(true)
    expect(isWithinHousingLoanPeriod(p, cfg2026, 2036)).toBe(false)
  })
  it('中古・令和7以前入居は性能によらず10年（usedPeriodByYear 未設定でフォールバック）', () => {
    const p = input({ moveInYear: 2025, construction: 'used', performance: 'certified' })
    expect(isWithinHousingLoanPeriod(p, cfg2025, 2034)).toBe(true) // 10年目=2034(elapsed 9)
    expect(isWithinHousingLoanPeriod(p, cfg2025, 2035)).toBe(false) // 11年目
  })
})
