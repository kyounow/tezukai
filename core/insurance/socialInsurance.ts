import { getTaxTable } from '@data/taxTables/index'
import type { StandardRemunerationGrade } from '@data/taxTables/2025'
import type { TaxTable } from '@data/taxTables/types'
import { floorTo1000 } from '../util/rounding'
import type { HealthInsuranceInput, SalaryBreakdown, SocialInsuranceBreakdown } from '../types'

/** 標準賞与額の上限。健保・介護・支援金は年度累計573万円、厚年は1か月150万円。 */
const HEALTH_BONUS_ANNUAL_CAP = 5_730_000
const PENSION_BONUS_MONTHLY_CAP = 1_500_000

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
 * 計算（sources-2025.md 参照）:
 * - 標準報酬月額は等級表で決定。報酬月額は、簡易モードは年収/12、賞与分離モードは月給。
 * - 賞与分離モードでは賞与に標準賞与額（健保 年度累計573万・厚年 月150万×回数の上限）で別計算。
 * - 健保＝協会けんぽ（東京・料率を折半）または組合健保（本人負担率を直接入力）。介護は40〜64歳のみ加算。
 *   令和8〜は協会けんぽの健康保険料率に子ども・子育て支援金率を加算（健保に含めて表示）。
 * - 雇用保険は賃金総額（＝年収、賞与含む）×本人料率。
 */
export function socialInsurance(
  salaryIncome: number,
  age: number,
  table: TaxTable = getTaxTable(),
  breakdown?: SalaryBreakdown,
  healthInsurance?: HealthInsuranceInput,
): SocialInsuranceBreakdown {
  if (salaryIncome <= 0) {
    return { health: 0, longTermCare: 0, pension: 0, employment: 0, total: 0 }
  }

  const si = table.socialInsurance
  const isCareInsured = age >= si.longTermCare.minAge && age <= si.longTermCare.maxAge

  // 被保険者（本人）負担の料率。協会けんぽは労使合計÷2、組合健保は手入力の本人負担率をそのまま使う。
  // 子ども・子育て支援金（令和8年度〜）は健保に上乗せ（協会けんぽ＝childSupportRate、組合＝手入力）。
  const isKumiai = healthInsurance?.type === 'kumiai'
  const healthEmployeeRate = isKumiai
    ? Math.max(0, healthInsurance?.kumiaiHealthRate ?? 0) + Math.max(0, healthInsurance?.kumiaiChildSupportRate ?? 0)
    : (si.health.rate + (si.health.childSupportRate ?? 0)) / 2
  const careEmployeeRate = isKumiai ? Math.max(0, healthInsurance?.kumiaiCareRate ?? 0) : si.longTermCare.rate / 2
  const pensionEmployeeRate = si.pension.rate / 2

  const monthly = breakdown ? breakdown.monthlySalary : salaryIncome / 12
  const healthStandard = standardRemuneration(monthly, table.healthGrades)
  const pensionStandard = standardRemuneration(monthly, table.pensionGrades)

  // 月額（標準報酬月額ベース）の本人負担×12。
  let health = roundPremium(healthStandard * healthEmployeeRate) * 12
  let longTermCare = isCareInsured ? roundPremium(healthStandard * careEmployeeRate) * 12 : 0
  let pension = roundPremium(pensionStandard * pensionEmployeeRate) * 12

  // 賞与分離モード: 標準賞与額（1000円未満切捨て）に上限を適用して別計算。
  if (breakdown) {
    const stdBonus = floorTo1000(Math.max(0, breakdown.annualBonus))
    const bonusCount = breakdown.bonusCount ?? 2
    const healthBonusBase = Math.min(stdBonus, HEALTH_BONUS_ANNUAL_CAP)
    const pensionBonusBase = Math.min(stdBonus, PENSION_BONUS_MONTHLY_CAP * Math.max(1, bonusCount))
    health += roundPremium(healthBonusBase * healthEmployeeRate)
    longTermCare += isCareInsured ? roundPremium(healthBonusBase * careEmployeeRate) : 0
    pension += roundPremium(pensionBonusBase * pensionEmployeeRate)
  }

  const employment = Math.floor(salaryIncome * si.employment.employeeRate)
  const total = health + longTermCare + pension + employment
  return { health, longTermCare, pension, employment, total }
}
