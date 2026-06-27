import { DEFAULT_TAX_YEAR, getTaxTable } from '@data/taxTables/index'
import type { TaxTable } from '@data/taxTables/types'
import { calculateTakeHome } from '../takeHome'
import type { TakeHomeInput, TakeHomeResult } from '../types'

/**
 * ふるさと納税の控除上限額（実質自己負担2,000円で寄附できる上限）の算出。
 *
 * 仕組み（寄附額 X のうち X−2,000 が3階建てで控除される）:
 *   1) 所得税の寄附金控除: (X−2,000) × 所得税の限界税率 ×(1+復興2.1%)
 *   2) 住民税の基本控除  : (X−2,000) × 10%
 *   3) 住民税の特例控除  : (X−2,000) ×(90% − 限界税率×1.021)  … 住民税所得割額の20%が上限
 *
 * 上限は特例控除が「住民税所得割額×20%」に達する点なので:
 *   控除上限額 = 住民税所得割額 × 0.2 ÷ (0.9 − 限界税率×1.021) + 2,000
 *
 * 注: あくまで概算の目安。ワンストップ特例/確定申告や他の税額控除で実際は変動する。
 */

/** 自己負担額（円）。 */
export const FURUSATO_SELF_BURDEN = 2_000
/** 特例控除の上限（住民税所得割額に対する割合）。 */
const SPECIAL_CREDIT_CAP_RATE = 0.2
/** 住民税の基本控除率。 */
const RESIDENT_BASIC_CREDIT_RATE = 0.1

export interface FurusatoResult {
  /** 控除上限額（円・実質負担2,000円の目安）。 */
  limit: number
  /** 算定の基礎となる住民税所得割額（調整控除後）。 */
  residentTaxIncomePortion: number
  /** 適用された所得税の限界税率。 */
  marginalIncomeTaxRate: number
  /** 自己負担額（円）。 */
  selfBurden: number
}

/** 所得税の課税所得から限界税率（速算表のブラケット税率）を返す。 */
export function marginalIncomeTaxRate(taxableIncomeTax: number, table: TaxTable = getTaxTable()): number {
  if (taxableIncomeTax <= 0) return 0
  const bracket = table.incomeTaxBrackets.find((b) => b.upTo === null || taxableIncomeTax <= b.upTo)
  return bracket ? bracket.rate : 0
}

/** 計算済みの手取り結果から控除上限額を求める。 */
export function furusatoFromResult(result: TakeHomeResult, table: TaxTable = getTaxTable()): FurusatoResult {
  const residentTaxIncomePortion = result.residentTaxDetail.incomePortion
  const rate = marginalIncomeTaxRate(result.taxableForIncomeTax, table)
  const denominator = 1 - RESIDENT_BASIC_CREDIT_RATE - rate * (1 + table.reconstructionSurtaxRate)

  let limit = 0
  if (residentTaxIncomePortion > 0 && denominator > 0) {
    limit = Math.floor((residentTaxIncomePortion * SPECIAL_CREDIT_CAP_RATE) / denominator) + FURUSATO_SELF_BURDEN
  }
  return { limit, residentTaxIncomePortion, marginalIncomeTaxRate: rate, selfBurden: FURUSATO_SELF_BURDEN }
}

/** 入力から控除上限額を求める（内部で手取り計算を再利用）。 */
export function furusatoLimit(input: TakeHomeInput): FurusatoResult {
  const table = getTaxTable(input.taxYear ?? DEFAULT_TAX_YEAR)
  return furusatoFromResult(calculateTakeHome(input), table)
}
