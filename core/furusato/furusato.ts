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
 *   3) 住民税の特例控除  : (X−2,000) ×(90% − 特例控除の税率×1.021)  … 住民税所得割額の20%が上限
 *
 * 特例控除(3)の「税率」は所得税の速算表を使うが、判定に用いる所得は住民税の課税総所得金額から
 * 人的控除差の合計を差し引いた額（地方税法37条の2）。令和7・8改正で所得税/住民税の基礎控除差が
 * 開いたため、所得税の課税所得で判定するとブラケットが1段ずれて上限を過小評価する。
 * このため所得税の限界税率(marginalIncomeTaxRate)と特例控除の税率(specialCreditRate)を分離する。
 *
 * 上限は特例控除が「住民税所得割額×20%」に達する点なので:
 *   控除上限額 = 住民税所得割額 × 0.2 ÷ (0.9 − 特例控除の税率×1.021) + 2,000
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
  /** 適用された所得税の限界税率（所得税の課税所得で判定・寄附金控除の還付に対応）。 */
  marginalIncomeTaxRate: number
  /** 特例控除に適用される税率（住民税課税総所得−人的控除差で判定・地方税法37条の2）。 */
  specialCreditRate: number
  /** 自己負担額（円）。 */
  selfBurden: number
}

/** 所得税の課税所得から限界税率（速算表のブラケット税率）を返す。 */
export function marginalIncomeTaxRate(taxableIncomeTax: number, table: TaxTable = getTaxTable()): number {
  if (taxableIncomeTax <= 0) return 0
  const bracket = table.incomeTaxBrackets.find((b) => b.upTo === null || taxableIncomeTax <= b.upTo)
  return bracket ? bracket.rate : 0
}

/**
 * ふるさと納税の特例控除・申告特例控除に適用される税率。
 * 所得税の速算表を用いるが、判定所得は「住民税の課税総所得金額 − 人的控除差の合計」（地方税法37条の2）。
 */
function specialCreditRate(result: TakeHomeResult, table: TaxTable = getTaxTable()): number {
  return marginalIncomeTaxRate(Math.max(0, result.taxableForResidentTax - result.humanDeductionDiffSum), table)
}

/** 計算済みの手取り結果から控除上限額を求める。 */
export function furusatoFromResult(result: TakeHomeResult, table: TaxTable = getTaxTable()): FurusatoResult {
  const residentTaxIncomePortion = result.residentTaxDetail.incomePortion
  const rate = marginalIncomeTaxRate(result.taxableForIncomeTax, table)
  const specialRate = specialCreditRate(result, table)
  const denominator = 1 - RESIDENT_BASIC_CREDIT_RATE - specialRate * (1 + table.reconstructionSurtaxRate)

  let limit = 0
  if (residentTaxIncomePortion > 0 && denominator > 0) {
    limit = Math.floor((residentTaxIncomePortion * SPECIAL_CREDIT_CAP_RATE) / denominator) + FURUSATO_SELF_BURDEN
  }
  return {
    limit,
    residentTaxIncomePortion,
    marginalIncomeTaxRate: rate,
    specialCreditRate: specialRate,
    selfBurden: FURUSATO_SELF_BURDEN,
  }
}

/** 入力から控除上限額を求める（内部で手取り計算を再利用）。 */
export function furusatoLimit(input: TakeHomeInput): FurusatoResult {
  const table = getTaxTable(input.taxYear ?? DEFAULT_TAX_YEAR)
  return furusatoFromResult(calculateTakeHome(input), table)
}

/** 寄附金控除の対象寄附額の上限（所得税は総所得金額等の40%、住民税基本分は30%）。 */
const INCOME_TAX_DONATION_CAP_RATE = 0.4
const RESIDENT_BASIC_DONATION_CAP_RATE = 0.3

/** ふるさと納税の「実績」入力に対する控除内訳と、控除後（次年度）の住民税。 */
export interface FurusatoActualResult {
  /** 入力した寄附額（円）。 */
  donation: number
  /** 控除上限額（実質負担2,000円の目安）。 */
  limit: number
  /** 上限内か（特例控除が20%上限に達していないか）。 */
  withinLimit: boolean
  /** 適用された所得税の限界税率（所得税側の寄附金控除・還付に対応）。 */
  marginalIncomeTaxRate: number
  /** 特例控除・申告特例控除に適用される税率（住民税課税総所得−人的控除差で判定）。 */
  specialCreditRate: number
  /** 所得税からの控除（還付・軽減）。確定申告時に所得税側で戻る分。 */
  incomeTaxCredit: number
  /** 住民税の基本控除（(寄附−2,000)×10%）。 */
  residentBasicCredit: number
  /** 住民税の特例控除（住民税所得割×20%が上限）。 */
  residentSpecialCredit: number
  /** 特例控除が20%上限に達したか（＝控除上限超過のサイン）。 */
  residentSpecialCapped: boolean
  /** 申告特例控除（ワンストップ特例で所得税相当分を住民税から控除。特例控除に連動し20%上限で頭打ち）。 */
  declarationSpecialCredit: number
  /** 確定申告の場合の控除総額（所得税＋住民税基本＋特例）。 */
  totalCreditFiling: number
  /** ワンストップ特例の場合の控除総額（住民税：基本＋特例＋申告特例）。 */
  totalCreditOneStop: number
  /** 確定申告の場合の実質自己負担。 */
  selfBurdenFiling: number
  /** ワンストップ特例の場合の実質自己負担（上限超過時は確定申告より大きくなり得る）。 */
  selfBurdenOneStop: number
  /** 控除前（今年度）の住民税。 */
  residentTaxBefore: number
  /** 確定申告の場合に翌年度住民税から引かれる額（基本＋特例）。 */
  residentControlFiling: number
  /** ワンストップ特例の場合に翌年度住民税から引かれる額（基本＋特例＋申告特例）。 */
  residentControlOneStop: number
  /** 確定申告の場合の控除後（次年度）住民税。 */
  residentTaxAfterFiling: number
  /** ワンストップ特例の場合の控除後（次年度）住民税。 */
  residentTaxAfterOneStop: number
}

/**
 * ふるさと納税の「実績」寄附額から、控除の3階建て内訳と控除後（次年度）の住民税を求める。
 *
 *   1) 所得税の寄附金控除: (寄附−2,000)×所得税の限界税率×1.021  … 対象は総所得金額等の40%まで（確定申告で所得税から）
 *   2) 住民税の基本控除  : (寄附−2,000)×10%                     … 対象は総所得金額等の30%まで
 *   3) 住民税の特例控除  : (寄附−2,000)×(90%−特例控除の税率×1.021) … 住民税所得割×20%が上限
 *
 * 特例控除(3)の税率は住民税の課税総所得金額−人的控除差で判定する（地方税法37条の2）。
 * 所得税側の寄附金控除(1)は従来どおり所得税の課税所得で判定した限界税率を用いる。
 *
 * ワンストップ特例（確定申告しない給与所得者）では、1) の代わりに「申告特例控除」が住民税から控除される。
 *   申告特例控除 ＝ 特例控除額 ×〔特例控除の税率×1.021 ÷(90%−特例控除の税率×1.021)〕（1円未満切上げ）
 * 特例控除が20%上限に張り付くと申告特例控除もそこで頭打ちになるため、
 * 上限超過時はワンストップの方が確定申告より控除が小さく（自己負担が大きく）なり得る。
 * 上限内であれば両方式の控除合計・実質負担はほぼ一致する（自己負担2,000円）。
 */
export function furusatoActual(
  result: TakeHomeResult,
  donation: number,
  table: TaxTable = getTaxTable(),
): FurusatoActualResult {
  const { limit } = furusatoFromResult(result, table)
  const rate = marginalIncomeTaxRate(result.taxableForIncomeTax, table)
  const grossRate = rate * (1 + table.reconstructionSurtaxRate)
  // 特例控除・申告特例控除は住民税ベースの税率で判定する（地方税法37条の2）。
  const specialRate = specialCreditRate(result, table)
  const specialGrossRate = specialRate * (1 + table.reconstructionSurtaxRate)
  const incomePortion = result.residentTaxDetail.incomePortion
  const totalIncome = Math.max(0, result.totalIncome)
  const D = Math.max(0, Math.floor(donation))

  const baseGeneric = Math.max(0, D - FURUSATO_SELF_BURDEN)
  const baseIncomeTax = Math.max(0, Math.min(D, Math.floor(totalIncome * INCOME_TAX_DONATION_CAP_RATE)) - FURUSATO_SELF_BURDEN)
  const baseResidentBasic = Math.max(0, Math.min(D, Math.floor(totalIncome * RESIDENT_BASIC_DONATION_CAP_RATE)) - FURUSATO_SELF_BURDEN)

  // 所得税の還付は所得税の限界税率、特例控除は住民税ベースの税率で計算する。
  const incomeTaxCredit = Math.floor(baseIncomeTax * grossRate)
  const residentBasicCredit = Math.floor(baseResidentBasic * RESIDENT_BASIC_CREDIT_RATE)
  const specialRaw = Math.floor(baseGeneric * (0.9 - specialGrossRate))
  const specialCap = Math.floor(incomePortion * SPECIAL_CREDIT_CAP_RATE)
  const residentSpecialCredit = Math.max(0, Math.min(specialRaw, specialCap))
  const residentSpecialCapped = specialRaw > specialCap

  // ワンストップ特例の申告特例控除＝特例控除額×割合（特例控除に連動。20%上限で頭打ち、1円未満切上げ）。
  const ratio = specialGrossRate < 0.9 ? specialGrossRate / (0.9 - specialGrossRate) : 0
  const declarationSpecialCredit = Math.ceil(residentSpecialCredit * ratio)

  const residentControlFiling = residentBasicCredit + residentSpecialCredit
  const residentControlOneStop = residentControlFiling + declarationSpecialCredit
  const totalCreditFiling = incomeTaxCredit + residentControlFiling
  const totalCreditOneStop = residentControlOneStop
  const selfBurdenFiling = Math.max(0, D - totalCreditFiling)
  const selfBurdenOneStop = Math.max(0, D - totalCreditOneStop)

  const residentTaxBefore = result.residentTax
  // 住民税はふるさと控除で所得割が減るが、均等割＋森林環境税は下げられない（下限）。
  const residentFloor = result.residentTaxDetail.perCapita + result.residentTaxDetail.forestTax
  const residentTaxAfterFiling = Math.max(residentFloor, residentTaxBefore - residentControlFiling)
  const residentTaxAfterOneStop = Math.max(residentFloor, residentTaxBefore - residentControlOneStop)

  return {
    donation: D,
    limit,
    withinLimit: D > 0 && !residentSpecialCapped,
    marginalIncomeTaxRate: rate,
    specialCreditRate: specialRate,
    incomeTaxCredit,
    residentBasicCredit,
    residentSpecialCredit,
    residentSpecialCapped,
    declarationSpecialCredit,
    totalCreditFiling,
    totalCreditOneStop,
    selfBurdenFiling,
    selfBurdenOneStop,
    residentTaxBefore,
    residentControlFiling,
    residentControlOneStop,
    residentTaxAfterFiling,
    residentTaxAfterOneStop,
  }
}
