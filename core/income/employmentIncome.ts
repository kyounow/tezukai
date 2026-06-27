import { getTaxTable } from '@data/taxTables/index'
import type { TaxTable } from '@data/taxTables/types'

/**
 * 給与所得控除額（円）。給与収入の区分ごとの速算式で算出する。
 * 控除額は給与収入を超えない（低収入で給与所得が負にならないようにする）。
 *
 * 注: 収入660万円未満は本来 別表第五（4,000円刻み）だが、本アプリは速算式で近似する。
 * 出典: 国税庁 No.1410（令和7年分・最低保障65万円）。
 */
export function employmentIncomeDeduction(salaryIncome: number, table: TaxTable = getTaxTable()): number {
  if (salaryIncome <= 0) return 0
  const bracket = table.employmentIncomeDeduction.find((b) => b.upTo === null || salaryIncome <= b.upTo)
  if (!bracket) throw new Error(`給与所得控除の区分が見つかりません: ${salaryIncome}`)
  const deduction = Math.floor(salaryIncome * bracket.rate + bracket.plus)
  return Math.min(salaryIncome, deduction)
}

/** 給与所得（円）＝給与収入−給与所得控除（0 未満にはしない）。 */
export function employmentIncome(salaryIncome: number, table: TaxTable = getTaxTable()): number {
  return Math.max(0, salaryIncome - employmentIncomeDeduction(salaryIncome, table))
}
