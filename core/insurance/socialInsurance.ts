import { getTaxTable } from '@data/taxTables/index'
import type { StandardRemunerationGrade } from '@data/taxTables/2025'
import type { TaxTable } from '@data/taxTables/types'
import type { SocialInsuranceBreakdown } from '../types'

/** 報酬月額から標準報酬月額を求める（等級表を昇順に走査し、下限を満たす最上位の等級）。 */
export function standardRemuneration(monthly: number, grades: readonly StandardRemunerationGrade[]): number {
  let standard = grades[0].standard
  for (const grade of grades) {
    if (monthly >= grade.lower) standard = grade.standard
    else break
  }
  return standard
}

/**
 * 保険料の被保険者負担分の端数処理（給与控除時）。
 * 1円未満が50銭以下は切捨て・50銭超は切上げ。
 * 出典: 日本年金機構「保険料の計算方法について」。
 */
export function roundPremium(yen: number): number {
  const frac = yen - Math.floor(yen)
  return frac > 0.5 ? Math.ceil(yen) : Math.floor(yen)
}

/**
 * 社会保険料（本人負担・年額）を概算する。
 *
 * 近似（sources-2025.md 参照）:
 * - 標準報酬月額は等級表で正確に決定するが、報酬月額＝年収/12 として求める
 *   （賞与は分離せず年収に含めて月割り）。
 * - 健保＝東京都・協会けんぽ（令和7年度）。介護は40〜64歳のみ加算。
 * - 雇用保険は賃金総額（≒年収）×本人料率。
 */
export function socialInsurance(
  salaryIncome: number,
  age: number,
  table: TaxTable = getTaxTable(),
): SocialInsuranceBreakdown {
  if (salaryIncome <= 0) {
    return { health: 0, longTermCare: 0, pension: 0, employment: 0, total: 0 }
  }

  const si = table.socialInsurance
  const monthly = salaryIncome / 12
  const healthStandard = standardRemuneration(monthly, table.healthGrades)
  const pensionStandard = standardRemuneration(monthly, table.pensionGrades)
  const isCareInsured = age >= si.longTermCare.minAge && age <= si.longTermCare.maxAge

  // 本人負担＝労使折半（料率÷2）。月額で端数処理してから12か月分。
  const health = roundPremium((healthStandard * si.health.rate) / 2) * 12
  const longTermCare = isCareInsured ? roundPremium((healthStandard * si.longTermCare.rate) / 2) * 12 : 0
  const pension = roundPremium((pensionStandard * si.pension.rate) / 2) * 12
  const employment = Math.floor(salaryIncome * si.employment.employeeRate)

  const total = health + longTermCare + pension + employment
  return { health, longTermCare, pension, employment, total }
}
