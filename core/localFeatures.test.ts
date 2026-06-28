import { describe, it, expect } from 'vitest'
import { getTaxTable } from '@data/taxTables/index'
import { socialInsurance } from './insurance/socialInsurance'
import { isWithinHousingLoanPeriod, housingLoanAvailableCredit } from './deductions/housingLoan'
import { residentTax } from './tax/residentTax'
import { calculateTakeHome } from './takeHome'
import type { HousingLoanInput } from './types'

const t2025 = getTaxTable(2025)

// ── A. 住宅ローン控除の控除期間判定 ──
describe('住宅ローン控除の控除期間（新築13年・中古10年）', () => {
  const cfg = t2025.housingLoan!
  const newHome: HousingLoanInput = { moveInYear: 2024, construction: 'new', performance: 'certified', yearEndBalance: 30_000_000 }
  const usedHome: HousingLoanInput = { ...newHome, construction: 'used' }

  it('新築は入居年〜13年目まで対象、14年目以降は対象外', () => {
    expect(isWithinHousingLoanPeriod(newHome, cfg, 2024)).toBe(true) // 1年目
    expect(isWithinHousingLoanPeriod(newHome, cfg, 2036)).toBe(true) // 13年目（2024+12）
    expect(isWithinHousingLoanPeriod(newHome, cfg, 2037)).toBe(false) // 14年目
  })

  it('中古は10年で打ち切り', () => {
    expect(isWithinHousingLoanPeriod(usedHome, cfg, 2033)).toBe(true) // 10年目（2024+9）
    expect(isWithinHousingLoanPeriod(usedHome, cfg, 2034)).toBe(false) // 11年目
  })

  it('入居前の年は対象外', () => {
    expect(isWithinHousingLoanPeriod(newHome, cfg, 2023)).toBe(false)
  })

  it('現行データ（令和7税年度・令和6入居）は期間内で控除あり', () => {
    expect(housingLoanAvailableCredit(newHome, 5_000_000, t2025)).toBeGreaterThan(0)
  })
})

// ── B. 65歳以上の社会保険 ──
describe('65歳以上の社会保険（厚年70歳・健保75歳の境界）', () => {
  it('65〜69歳: 厚年・健保・雇用は継続、介護は給与天引きなし', () => {
    const r = socialInsurance(5_000_000, 68, t2025)
    expect(r.pension).toBe(450_180)
    expect(r.health).toBe(243_780)
    expect(r.longTermCare).toBe(0) // 65歳以上は第1号（給与天引きでない）
    expect(r.employment).toBe(27_500)
  })

  it('70〜74歳: 厚生年金は資格喪失で0、健保・雇用は継続', () => {
    const r = socialInsurance(5_000_000, 72, t2025)
    expect(r.pension).toBe(0)
    expect(r.health).toBe(243_780)
    expect(r.employment).toBe(27_500)
  })

  it('75歳以上: 健保も後期高齢者医療へ移行で0、雇用のみ', () => {
    const r = socialInsurance(5_000_000, 76, t2025)
    expect(r.health).toBe(0)
    expect(r.pension).toBe(0)
    expect(r.longTermCare).toBe(0)
    expect(r.employment).toBe(27_500)
    expect(r.total).toBe(27_500)
  })
})

// ── 住民税の自治体差（級地区分・均等割の超過課税） ──
describe('住民税の自治体差（級地区分・均等割の上書き）', () => {
  it('級地区分で均等割の非課税限度額が変わる（単身・合計所得40万）', () => {
    const base = { taxableForResident: 0, humanDeductionDiffSum: 0, totalIncome: 400_000, dependentCount: 0 }
    // 1級地: 35万+10万=45万 ≧ 40万 → 非課税（均等割0）
    expect(residentTax({ ...base, gradeFactor: 1 }, t2025).perCapita).toBe(0)
    // 3級地: 28万+10万=38万 < 40万 → 課税（均等割が出る）
    expect(residentTax({ ...base, gradeFactor: 0.8 }, t2025).perCapita).toBe(4_000)
  })

  it('均等割の上書き（超過課税・例 4,900円）が反映される', () => {
    const r = residentTax(
      { taxableForResident: 3_000_000, humanDeductionDiffSum: 0, totalIncome: 3_560_000, dependentCount: 0, perCapitaOverride: 4_900 },
      t2025,
    )
    expect(r.perCapita).toBe(4_900)
    expect(r.forestTax).toBe(1_000) // 森林環境税は国税で固定
  })

  it('統合: 均等割上書きで住民税が増える（年収500万・単身）', () => {
    const std = calculateTakeHome({ salaryIncome: 5_000_000, age: 30, taxYear: 2025 })
    const yokohama = calculateTakeHome({ salaryIncome: 5_000_000, age: 30, taxYear: 2025, residentPerCapitaOverride: 4_900 })
    expect(yokohama.residentTaxDetail.perCapita).toBe(4_900)
    expect(yokohama.residentTax).toBe(std.residentTax + 900)
  })
})
