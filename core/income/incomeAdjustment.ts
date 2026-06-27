/**
 * 所得金額調整控除（子ども・特別障害者等を有する者等）。
 *
 * 給与等の収入金額が850万円超で、次のいずれかに該当する場合、
 *   控除額 =（min(給与収入, 1,000万円) − 850万円）× 10%（最高15万円）
 * を給与所得から控除する。所得税・個人住民税とも同額。
 *   (1) 本人が特別障害者
 *   (2) 23歳未満の扶養親族を有する
 *   (3) 特別障害者である同一生計配偶者または扶養親族を有する
 * 出典: 国税庁 No.1411 所得金額調整控除。
 *
 * 注: 給与所得と公的年金等の双方がある場合の調整控除（別類型）は未対応。
 */
import type { IncomeAdjustmentInput } from '../types'

const SALARY_THRESHOLD = 8_500_000
const SALARY_CAP = 10_000_000
const RATE = 0.1

/** 所得金額調整控除額（円）。給与所得から差し引く。 */
export function incomeAdjustmentDeduction(salaryIncome: number, cond: IncomeAdjustmentInput): number {
  const eligible = !!(cond.hasYoungDependent || cond.selfSpecialDisability || cond.specialDisabilityFamily)
  if (!eligible || salaryIncome <= SALARY_THRESHOLD) return 0
  return Math.floor((Math.min(salaryIncome, SALARY_CAP) - SALARY_THRESHOLD) * RATE)
}
