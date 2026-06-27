import { describe, it, expect } from 'vitest'
import { housingLoanLimit, housingLoanAvailableCredit } from './housingLoan'
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
