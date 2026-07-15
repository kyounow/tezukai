import { getTaxTable } from '@data/taxTables/index'
import type { HousingLoanConfig, TaxTable } from '@data/taxTables/types'
import type { HousingLoanInput } from '../types'

/**
 * 住宅ローン控除の借入限度額（円）を 入居年×取得区分×住宅性能 から引く。
 * 子育て・若者夫婦世帯は令和6・7の新築のみ上乗せ。該当区分が無ければ0（対象外）。
 * 出典: 国税庁 No.1211-1（新築）/No.1211-3（中古）、国交省。
 */
export function housingLoanLimit(input: HousingLoanInput, cfg: HousingLoanConfig): number {
  if (input.construction === 'used') {
    const byYear = cfg.limits.usedByYear?.[input.moveInYear]
    if (byYear) {
      const map = input.childcareHousehold ? byYear.childcare : byYear.standard
      return map[input.performance] ?? 0
    }
    return cfg.limits.used[input.performance] ?? 0
  }
  const childcareMap = input.childcareHousehold ? cfg.limits.newChildcare[input.moveInYear] : undefined
  const yearMap = childcareMap ?? cfg.limits.new[input.moveInYear]
  return yearMap ? (yearMap[input.performance] ?? 0) : 0
}

/**
 * 控除期間内か（対象年が 入居年〜入居年＋控除期間−1 の範囲か）を判定する。
 * 新築・買取再販は13年、既存住宅（中古）は原則10年。ただし令和8以降入居の中古で
 * 省エネ性能の高い区分（認定/ZEH/省エネ基準適合）は usedPeriodByYear で13年に拡充。
 * 期間を過ぎた年・入居前は対象外。出典: 国税庁 No.1211-1 / No.1211-3、財務省 令和8年度税制改正の大綱。
 */
export function isWithinHousingLoanPeriod(input: HousingLoanInput, cfg: HousingLoanConfig, taxYear: number): boolean {
  const period =
    input.construction === 'used'
      ? (cfg.usedPeriodByYear?.[input.moveInYear]?.[input.performance] ?? cfg.period.used)
      : cfg.period.new
  const elapsed = taxYear - input.moveInYear // 入居年が1年目（elapsed 0）
  return elapsed >= 0 && elapsed < period
}

/**
 * 住宅ローン控除の控除可能額（年末残高×0.7%、借入限度内）。
 * 合計所得金額が上限（2,000万円）を超える年・控除期間を過ぎた年は適用なし。
 * 所得税/住民税への配分は呼び出し側（takeHome）で行う。
 */
export function housingLoanAvailableCredit(
  input: HousingLoanInput,
  totalIncome: number,
  table: TaxTable = getTaxTable(),
): number {
  const cfg = table.housingLoan
  if (!cfg) return 0
  if (totalIncome > cfg.incomeLimit) return 0
  if (!isWithinHousingLoanPeriod(input, cfg, table.year)) return 0
  const limit = housingLoanLimit(input, cfg)
  if (limit <= 0) return 0
  const base = Math.min(Math.max(0, input.yearEndBalance), limit)
  return Math.floor(base * cfg.creditRate)
}
