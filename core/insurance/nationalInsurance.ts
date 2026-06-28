import { getTaxTable } from '@data/taxTables/index'
import type { TaxTable } from '@data/taxTables/types'
import type { SocialInsuranceBreakdown } from '../types'

/**
 * 個人事業主の社会保険料（国民年金＋国民健康保険・本人負担＝全額）。
 *
 * 国民年金は定額（年額）。国民健康保険は代表自治体（東京特別区・概算）で:
 *   各区分 = min(旧ただし書き所得×所得割率 + 均等割×加入人数, 賦課限度額)
 *   旧ただし書き所得 = max(0, 総所得金額等 − 43万円)
 * 介護分は本人が40〜64歳のときのみ（均等割は本人1人分で概算）。
 *
 * 戻り値は給与社保と同じ内訳型に対応づける:
 *   pension=国民年金、health=国保(医療分+支援金分)、longTermCare=国保(介護分)、employment=0。
 *
 * 近似（TODO.md 参照）: 所得割は本人の所得のみ・均等割×加入人数（世帯員の所得は未算入）、
 * 自治体差・賦課限度の世帯合算の細部は概算。
 */
export function nationalInsurance(
  totalIncome: number,
  age: number,
  kokuhoMembers: number = 1,
  table: TaxTable = getTaxTable(),
): SocialInsuranceBreakdown {
  const pension = table.nationalPension?.annual ?? 0
  const nhi = table.nationalHealthInsurance
  if (!nhi) {
    return { health: 0, longTermCare: 0, pension, employment: 0, total: pension }
  }

  const base = Math.max(0, Math.floor(totalIncome) - nhi.basicDeduction) // 旧ただし書き所得
  const members = Math.max(1, Math.floor(kokuhoMembers))
  const isCare = age >= nhi.longTermCare.minAge && age <= nhi.longTermCare.maxAge

  const medical = Math.min(Math.floor(base * nhi.medical.incomeRate) + nhi.medical.perCapita * members, nhi.medical.cap)
  const support = Math.min(Math.floor(base * nhi.support.incomeRate) + nhi.support.perCapita * members, nhi.support.cap)
  const care = isCare
    ? Math.min(Math.floor(base * nhi.longTermCare.incomeRate) + nhi.longTermCare.perCapita, nhi.longTermCare.cap)
    : 0

  const health = medical + support
  const longTermCare = care
  return { health, longTermCare, pension, employment: 0, total: pension + health + longTermCare }
}
