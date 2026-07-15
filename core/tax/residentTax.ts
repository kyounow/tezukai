import { getTaxTable } from '@data/taxTables/index'
import type { TaxTable } from '@data/taxTables/types'
import { floorTo1000, floorTo100 } from '../util/rounding'
import type { ResidentTaxBreakdown } from '../types'

/**
 * 調整控除額（円）。所得税と住民税の人的控除額の差に基づき所得割から控除する。
 * 出典: 東京都主税局 個人住民税（調整控除）。
 */
export function adjustmentCredit(
  taxableResident: number,
  humanDeductionDiffSum: number,
  totalIncome: number,
  table: TaxTable = getTaxTable(),
): number {
  const { threshold, rate, minimumOverThreshold, incomeCap } = table.residentTax.adjustment
  if (totalIncome > incomeCap) return 0
  if (humanDeductionDiffSum <= 0 || taxableResident <= 0) return 0

  if (taxableResident <= threshold) {
    return Math.floor(Math.min(humanDeductionDiffSum, taxableResident) * rate)
  }
  const remainder = Math.max(humanDeductionDiffSum - (taxableResident - threshold), 50_000)
  return Math.max(Math.floor(remainder * rate), minimumOverThreshold)
}

export interface ResidentTaxParams {
  /** 住民税の課税標準（住民税用の所得控除を引いた後。1,000円未満切捨て前でも可）。 */
  taxableForResident: number
  /** 調整控除に用いる人的控除額の差の合計。 */
  humanDeductionDiffSum: number
  /** 本人の合計所得金額（非課税判定・調整控除の所得制限に使用）。 */
  totalIncome: number
  /** 同一生計配偶者＋扶養親族の人数（本人を除く）。非課税限度額の判定に使用。 */
  dependentCount: number
  /** 非課税限度額の級地率（1級地1.0／2級地0.9／3級地0.8。省略時1.0）。基本額・加算額に乗じる（+10万は対象外）。 */
  gradeFactor?: number
  /** 均等割額の上書き（市区町村＋都道府県・森林環境税を除く・円）。超過課税の自治体向け。省略時は標準額。 */
  perCapitaOverride?: number
  /**
   * 障害者・未成年者・寡婦・ひとり親に該当するか（地方税法295条）。
   * 該当し合計所得金額が非課税限度（135万円）以下なら均等割・所得割とも非課税になる。
   */
  personalNonTaxableEligible?: boolean
}

/**
 * 個人住民税（所得割＋均等割＋森林環境税）を算出する。
 * 所得割は市町村分・道府県分を別々に100円未満切捨て。均等割・森林環境税は非課税限度額で判定。
 * 出典: 総務省・東京都主税局・川崎市計算例（端数処理）。
 */
export function residentTax(p: ResidentTaxParams, table: TaxTable = getTaxTable()): ResidentTaxBreakdown {
  const rt = table.residentTax
  const nt = table.residentTaxNonTaxable
  const taxable = floorTo1000(Math.max(0, p.taxableForResident))
  const count = 1 + Math.max(0, p.dependentCount)
  const hasDependents = p.dependentCount > 0

  // 非課税限度額は級地率を基本額(35万)・加算額(21万/32万)に乗じる。+10万(base)は国一律で級地率を掛けない。
  const factor = p.gradeFactor ?? 1
  const perPerson = Math.round(nt.perPerson * factor)
  const perCapitaLimit = perPerson * count + nt.base + (hasDependents ? Math.round(nt.perCapitaAddition * factor) : 0)
  const incomePortionLimit = perPerson * count + nt.base + (hasDependents ? Math.round(nt.incomePortionAddition * factor) : 0)
  // 障害者・未成年者・寡婦・ひとり親は合計所得135万円以下で均等割・所得割とも非課税（地方税法295条・級地率なし）。
  const personalNonTaxable = (p.personalNonTaxableEligible ?? false) && p.totalIncome <= nt.personalNonTaxable
  const perCapitaExempt = p.totalIncome <= perCapitaLimit || personalNonTaxable
  const incomePortionExempt = p.totalIncome <= incomePortionLimit || personalNonTaxable

  const adj = adjustmentCredit(taxable, p.humanDeductionDiffSum, p.totalIncome, table)

  let incomePortion = 0
  if (!incomePortionExempt && taxable > 0) {
    const cityPortion = floorTo100(Math.max(0, taxable * rt.incomeRate.city - adj * 0.6))
    const prefPortion = floorTo100(Math.max(0, taxable * rt.incomeRate.prefecture - adj * 0.4))
    incomePortion = cityPortion + prefPortion
  }

  // 均等割は超過課税の自治体向けに上書き可（森林環境税は国税で固定）。
  const perCapitaAmount = p.perCapitaOverride ?? rt.perCapita.total
  const perCapita = perCapitaExempt ? 0 : perCapitaAmount
  const forestTax = perCapitaExempt ? 0 : rt.forestTax

  return {
    incomePortion,
    perCapita,
    forestTax,
    adjustmentCredit: incomePortionExempt ? 0 : adj,
    total: incomePortion + perCapita + forestTax,
    perCapitaExempt,
    incomePortionExempt,
  }
}
