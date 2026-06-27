import { SOCIAL_INSURANCE_2025 } from '@data/taxTables/2025'
import type { SocialInsuranceBreakdown } from '../types'

type SocialInsuranceTable = typeof SOCIAL_INSURANCE_2025

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value))
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
 * MVP の近似（sources-2025.md 参照）:
 * - 標準報酬月額 ≒ 月額（年収/12）。健保・厚年とも下限/上限のみ正確にクランプ。
 * - 中間の等級刻みは省略。賞与は分離せず年収に含めて月割り。
 * - 健保＝東京都・協会けんぽ（令和7年度）。介護は40〜64歳のみ加算。
 * - 雇用保険は賃金総額（≒年収）×本人料率。
 */
export function socialInsurance(
  salaryIncome: number,
  age: number,
  table: SocialInsuranceTable = SOCIAL_INSURANCE_2025,
): SocialInsuranceBreakdown {
  if (salaryIncome <= 0) {
    return { health: 0, longTermCare: 0, pension: 0, employment: 0, total: 0 }
  }

  const monthly = salaryIncome / 12
  const healthStandard = clamp(monthly, table.health.standardFloor, table.health.standardCap)
  const pensionStandard = clamp(monthly, table.pension.standardFloor, table.pension.standardCap)
  const isCareInsured = age >= table.longTermCare.minAge && age <= table.longTermCare.maxAge

  // 本人負担＝労使折半（料率÷2）。月額で端数処理してから12か月分。
  const health = roundPremium((healthStandard * table.health.rate) / 2) * 12
  const longTermCare = isCareInsured ? roundPremium((healthStandard * table.longTermCare.rate) / 2) * 12 : 0
  const pension = roundPremium((pensionStandard * table.pension.rate) / 2) * 12
  const employment = Math.floor(salaryIncome * table.employment.employeeRate)

  const total = health + longTermCare + pension + employment
  return { health, longTermCare, pension, employment, total }
}
