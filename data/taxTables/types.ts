/**
 * 年度別ルールセット（TaxTable）の型定義。
 *
 * 1年度分の税率・控除・社保の全ルールを 1 つの集約 `TaxTable` にまとめ、
 * `index.ts` のレジストリから年度で差し替える。法改正対応の中核。
 *
 * - 数値だけ変わる改正: 新しい `<年度>.ts` を足して登録するだけ。
 * - 構造が変わる改正: 新設控除は optional フィールド（無ければ計算側で0扱い）。
 *   データで表せない式変更のときだけ `rulesetVersion` で関数内分岐（最終手段）。
 *
 * 各区分の細かい型（DeductionBracket 等）は 2025.ts 側の定義を型として流用する
 * （型のみの循環参照。実行時の依存は生じない）。
 */
import type {
  AmountByIncomeBand,
  DependentDeductionTable,
  DeductionBracket,
  ProgressiveBracket,
  SpouseDeductionTable,
  SpouseSpecialBand,
  StandardRemunerationGrade,
} from './2025'

/** 対象年度（西暦）。年度追加時にこのユニオンを拡張する。 */
export type TaxYear = 2025

export interface ResidentTaxConfig {
  readonly incomeRate: { readonly city: number; readonly prefecture: number; readonly total: number }
  readonly perCapita: { readonly city: number; readonly prefecture: number; readonly total: number }
  readonly forestTax: number
  readonly adjustment: {
    readonly threshold: number
    readonly rate: number
    readonly minimumOverThreshold: number
    readonly incomeCap: number
  }
}

export interface ResidentTaxNonTaxable {
  readonly perPerson: number
  readonly base: number
  readonly perCapitaAddition: number
  readonly incomePortionAddition: number
}

export interface HumanDeductionDiff {
  readonly basic: number
  readonly spouseGeneral: number
  readonly spouseElderly: number
  readonly spouseSpecial: number
  readonly dependentGeneral: number
  readonly dependentSpecified: number
  readonly dependentElderlyOther: number
  readonly dependentCoLiving: number
}

export interface SocialInsuranceConfig {
  readonly health: { readonly rate: number }
  readonly longTermCare: { readonly rate: number; readonly minAge: number; readonly maxAge: number }
  readonly pension: { readonly rate: number }
  readonly employment: { readonly employeeRate: number }
}

/** 1年度分の税・社保ルールの集約。 */
export interface TaxTable {
  readonly year: TaxYear
  readonly employmentIncomeDeduction: readonly DeductionBracket[]
  readonly incomeTaxBrackets: readonly ProgressiveBracket[]
  readonly reconstructionSurtaxRate: number
  readonly basicDeduction: {
    readonly incomeTax: readonly AmountByIncomeBand[]
    readonly residentTax: readonly AmountByIncomeBand[]
  }
  readonly ownerIncomeTiers: readonly number[]
  readonly spouseDeductionIncomeLimit: number
  readonly spouseSpecialDeductionIncomeLimit: number
  readonly spouseDeduction: { readonly incomeTax: SpouseDeductionTable; readonly residentTax: SpouseDeductionTable }
  readonly spouseSpecialDeduction: {
    readonly incomeTax: readonly SpouseSpecialBand[]
    readonly residentTax: readonly SpouseSpecialBand[]
  }
  readonly dependentDeduction: {
    readonly incomeTax: DependentDeductionTable
    readonly residentTax: DependentDeductionTable
  }
  /** 特定親族特別控除（令和7新設）。その年度に制度が無ければ未設定。 */
  readonly specialRelativeDeduction?: {
    readonly incomeTax: readonly AmountByIncomeBand[]
    readonly residentTax: readonly AmountByIncomeBand[]
  }
  readonly residentTax: ResidentTaxConfig
  readonly residentTaxNonTaxable: ResidentTaxNonTaxable
  readonly humanDeductionDiff: HumanDeductionDiff
  readonly socialInsurance: SocialInsuranceConfig
  readonly healthGrades: readonly StandardRemunerationGrade[]
  readonly pensionGrades: readonly StandardRemunerationGrade[]
  /** データで表せない式変更のときのみ使用（原則 undefined）。 */
  readonly rulesetVersion?: number
}
