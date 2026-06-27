import { DEFAULT_TAX_YEAR } from '@core/index'
import type { TakeHomeInput, TaxYear } from '@core/index'

/** 入力フォームの状態（UI 都合の平坦な構造）。 */
export interface FormState {
  /** 対象年度（税制ルールセットの選択）。 */
  taxYear: TaxYear
  /** 額面年収（円）。 */
  salaryIncome: number
  /** 本人の年齢。 */
  age: number
  /** 配偶者の有無。 */
  hasSpouse: boolean
  /** 配偶者の給与収入（円）。 */
  spouseSalaryIncome: number
  /** 配偶者が70歳以上か。 */
  spouseElderly: boolean
  /** 年少扶養親族（16歳未満）の人数。扶養控除0だが住民税の非課税判定に影響。 */
  depUnder16: number
  /** 一般の扶養親族（16〜18・23〜69歳）の人数。 */
  depGeneral: number
  /** 特定扶養親族（19〜22歳・所得58万以下）の人数。 */
  depSpecified: number
  /** 老人扶養親族・同居老親等の人数。 */
  depElderlyCoLiving: number
  /** 老人扶養親族・同居老親等以外の人数。 */
  depElderlyOther: number
}

export const defaultForm: FormState = {
  taxYear: DEFAULT_TAX_YEAR,
  salaryIncome: 5_000_000,
  age: 35,
  hasSpouse: false,
  spouseSalaryIncome: 0,
  spouseElderly: false,
  depUnder16: 0,
  depGeneral: 0,
  depSpecified: 0,
  depElderlyCoLiving: 0,
  depElderlyOther: 0,
}

/** フォーム状態をコア計算の入力に変換する。 */
export function toInput(f: FormState): TakeHomeInput {
  return {
    taxYear: f.taxYear,
    salaryIncome: f.salaryIncome,
    age: f.age,
    spouse: f.hasSpouse ? { salaryIncome: f.spouseSalaryIncome, elderly: f.spouseElderly } : undefined,
    dependents: {
      under16: f.depUnder16,
      general: f.depGeneral,
      specified: f.depSpecified,
      elderlyCoLiving: f.depElderlyCoLiving,
      elderlyOther: f.depElderlyOther,
    },
  }
}
