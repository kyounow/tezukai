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
export type TaxYear = 2025 | 2026

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
  /** 健康保険。childSupportRate は子ども・子育て支援金率（令和8年度新設・健保に上乗せ）。 */
  readonly health: { readonly rate: number; readonly childSupportRate?: number }
  readonly longTermCare: { readonly rate: number; readonly minAge: number; readonly maxAge: number }
  /** 厚生年金。maxAge＝この年齢に達すると資格喪失（70歳以上は保険料なし）。 */
  readonly pension: { readonly rate: number; readonly maxAge?: number }
  readonly employment: { readonly employeeRate: number }
  /** 後期高齢者医療制度へ移行する年齢（この年齢以上は健康保険の給与天引きなし）。 */
  readonly latterStageElderlyAge?: number
}

// ── Phase 4: 拡張控除の設定型 ──────────────────────────────

export interface MedicalExpenseConfig {
  /** 足切り額（原則）。総所得金額等200万円以上で適用。 */
  readonly floorAmount: number
  /** 総所得金額等200万円未満のときの足切り率。 */
  readonly floorRate: number
  /** 医療費控除額の上限。 */
  readonly cap: number
  /** セルフメディケーション税制。 */
  readonly selfMedication: { readonly floor: number; readonly cap: number }
}

/** 生命保険料控除の区分（一般／介護医療／個人年金）共通の段階式（所得税・住民税別）。 */
export interface LifeInsuranceRegime {
  readonly incomeTax: readonly DeductionBracket[]
  readonly residentTax: readonly DeductionBracket[]
}

export interface LifeInsuranceConfig {
  /** 新制度（平成24年1月1日以後契約）。 */
  readonly newRegime: LifeInsuranceRegime
  /** 旧制度（平成23年12月31日以前契約）。 */
  readonly oldRegime: LifeInsuranceRegime
  /** 同一区分で新旧併用時の区分上限（新制度の上限額を用いる）。 */
  readonly combinedCategoryCap: { readonly incomeTax: number; readonly residentTax: number }
  /** 3区分合計の適用限度額。 */
  readonly totalCap: { readonly incomeTax: number; readonly residentTax: number }
  /**
   * 子育て世帯（23歳未満の扶養親族あり）の拡充（令和8年分のみ）。
   * 一般生命保険料(新契約)の所得税の段階式と区分上限を上書きする。住民税は据置。
   */
  readonly childcareGeneralNew?: {
    readonly incomeTax: readonly DeductionBracket[]
    readonly combinedCap: number
  }
}

/** 地震保険料控除の所得税用/住民税用の1区分。 */
export interface EarthquakeInsuranceRegime {
  /** 地震保険料: 支払額×rate（上限cap）。所得税は全額(rate1)/上限5万、住民税は1/2/上限2.5万。 */
  readonly earthquake: { readonly rate: number; readonly cap: number }
  /** 旧長期損害保険料（経過措置）の段階式。 */
  readonly oldLongTerm: readonly DeductionBracket[]
  /** 地震＋旧長期の合算上限。 */
  readonly totalCap: number
}

/** 地震保険料控除。 */
export interface EarthquakeInsuranceConfig {
  readonly incomeTax: EarthquakeInsuranceRegime
  readonly residentTax: EarthquakeInsuranceRegime
}

/** 住宅の取得区分（新築・買取再販 / 既存=中古）。 */
export type HousingConstruction = 'new' | 'used'
/** 住宅の環境性能区分。 */
export type HousingPerformance = 'certified' | 'zeh' | 'energySaving' | 'other'

export interface HousingLoanConfig {
  /** 控除率（現行0.7%）。 */
  readonly creditRate: number
  /** 適用の合計所得金額の上限。 */
  readonly incomeLimit: number
  /** 所得税で引ききれない分の住民税からの控除上限。 */
  readonly residentCarryover: { readonly rate: number; readonly cap: number }
  /** 控除期間（表示用・新築/中古）。 */
  readonly period: { readonly new: number; readonly used: number }
  /** 借入限度額（円）。入居年(西暦)→住宅性能区分。childcare は令和6以降新築の上乗せ。 */
  readonly limits: {
    readonly new: Readonly<Record<number, Readonly<Record<HousingPerformance, number>>>>
    readonly newChildcare: Readonly<Record<number, Readonly<Record<HousingPerformance, number>>>>
    /** 中古（既存）の標準。入居年に依存しない場合のフォールバック。 */
    readonly used: Readonly<Record<HousingPerformance, number>>
    /** 中古で入居年により限度が異なる場合（令和8以降は子育て上乗せもあり）。 */
    readonly usedByYear?: Readonly<
      Record<
        number,
        {
          readonly standard: Readonly<Record<HousingPerformance, number>>
          readonly childcare: Readonly<Record<HousingPerformance, number>>
        }
      >
    >
  }
}

// ── Phase 5: 個人事業主モード（国民年金・国民健康保険） ──

/** 国民年金保険料（第1号被保険者・定額）。 */
export interface NationalPensionConfig {
  /** 年額（円）。 */
  readonly annual: number
}

/** 国民健康保険の1区分（所得割率・均等割・賦課限度額）。 */
export interface KokuhoCategory {
  readonly incomeRate: number
  readonly perCapita: number
  readonly cap: number
}

/** 国民健康保険（代表自治体・概算）。 */
export interface NationalHealthInsuranceConfig {
  /** 賦課基準額＝総所得金額等−この額（旧ただし書き所得の基礎控除）。 */
  readonly basicDeduction: number
  /** 医療分（基礎賦課額）。 */
  readonly medical: KokuhoCategory
  /** 後期高齢者支援金分。 */
  readonly support: KokuhoCategory
  /** 介護分（40〜64歳のみ）。 */
  readonly longTermCare: KokuhoCategory & { readonly minAge: number; readonly maxAge: number }
  /** 代表自治体の表示名。 */
  readonly areaLabel: string
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
  /** 拡張控除（Phase 4）。その年度に制度が無ければ未設定。 */
  readonly medicalExpense?: MedicalExpenseConfig
  readonly lifeInsurance?: LifeInsuranceConfig
  readonly earthquakeInsurance?: EarthquakeInsuranceConfig
  readonly housingLoan?: HousingLoanConfig
  /** 個人事業主モード（Phase 5）。 */
  readonly nationalPension?: NationalPensionConfig
  readonly nationalHealthInsurance?: NationalHealthInsuranceConfig
  /** データで表せない式変更のときのみ使用（原則 undefined）。 */
  readonly rulesetVersion?: number
}
