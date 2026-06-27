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

  const perCapitaLimit = nt.perPerson * count + nt.base + (hasDependents ? nt.perCapitaAddition : 0)
  const incomePortionLimit = nt.perPerson * count + nt.base + (hasDependents ? nt.incomePortionAddition : 0)
  const perCapitaExempt = p.totalIncome <= perCapitaLimit
  const incomePortionExempt = p.totalIncome <= incomePortionLimit

  const adj = adjustmentCredit(taxable, p.humanDeductionDiffSum, p.totalIncome, table)

  let incomePortion = 0
  if (!incomePortionExempt && taxable > 0) {
    const cityPortion = floorTo100(Math.max(0, taxable * rt.incomeRate.city - adj * 0.6))
    const prefPortion = floorTo100(Math.max(0, taxable * rt.incomeRate.prefecture - adj * 0.4))
    incomePortion = cityPortion + prefPortion
  }

  const perCapita = perCapitaExempt ? 0 : rt.perCapita.total
  const forestTax = perCapitaExempt ? 0 : rt.forestTax

  return {
    incomePortion,
    perCapita,
    forestTax,
    adjustmentCredit: incomePortionExempt ? 0 : adj,
    total: incomePortion + perCapita + forestTax,
  }
}
