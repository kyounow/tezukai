import type { TakeHomeInput } from '@core/index'

/** 入力フォームの状態（UI 都合の平坦な構造）。 */
export interface FormState {
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
  salaryIncome: 5_000_000,
  age: 35,
  hasSpouse: false,
  spouseSalaryIncome: 0,
  spouseElderly: false,
  depGeneral: 0,
  depSpecified: 0,
  depElderlyCoLiving: 0,
  depElderlyOther: 0,
}

/** フォーム状態をコア計算の入力に変換する。 */
export function toInput(f: FormState): TakeHomeInput {
  return {
    salaryIncome: f.salaryIncome,
    age: f.age,
    spouse: f.hasSpouse ? { salaryIncome: f.spouseSalaryIncome, elderly: f.spouseElderly } : undefined,
    dependents: {
      general: f.depGeneral,
      specified: f.depSpecified,
      elderlyCoLiving: f.depElderlyCoLiving,
      elderlyOther: f.depElderlyOther,
    },
  }
}
