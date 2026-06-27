/**
 * tezukai コア計算層の入出力型（UI 非依存）。
 *
 * 対象は給与所得者モード・令和7年（2025）。すべて「円」単位の整数で扱う。
 * 計算の年度対応は data/taxTables/sources-2025.md を参照
 * （所得税＝令和7年分／住民税＝令和8年度／給与所得控除は令和7年所得ベース）。
 */

/** 対象年度（西暦）。当面は 2025（令和7年）のみ。 */
export type TaxYear = 2025

/** 配偶者の入力。 */
export interface SpouseInput {
  /** 配偶者の給与収入（額面・円）。給与以外の所得は当面未対応。 */
  salaryIncome: number
  /** その年12月31日時点で70歳以上か（老人控除対象配偶者の判定）。 */
  elderly?: boolean
}

/** 扶養親族の入力（16歳未満は扶養控除の対象外なので含めない）。 */
export interface DependentsInput {
  /** 一般の控除対象扶養親族（16〜18歳・23〜69歳、合計所得58万円以下）の人数。 */
  general?: number
  /** 特定扶養親族（19〜22歳、合計所得58万円以下）の人数。 */
  specified?: number
  /** 老人扶養親族・同居老親等（70歳以上、本人/配偶者の直系尊属で同居）の人数。 */
  elderlyCoLiving?: number
  /** 老人扶養親族・同居老親等以外（70歳以上）の人数。 */
  elderlyOther?: number
  /**
   * 特定親族特別控除の対象（19〜22歳、合計所得58万円超123万円以下）の
   * 各人の「合計所得金額（円）」のリスト。区分ごとの控除額を所得額から判定する。
   */
  specialRelativeIncomes?: number[]
}

/** 手取り計算への入力。 */
export interface TakeHomeInput {
  /** 対象年度（省略時 2025）。 */
  taxYear?: TaxYear
  /** 給与収入（額面年収・円）。 */
  salaryIncome: number
  /** 本人の年齢。介護保険第2号被保険者（40〜64歳）の判定に使用。 */
  age: number
  /** 配偶者（いなければ省略）。 */
  spouse?: SpouseInput
  /** 扶養親族（いなければ省略）。 */
  dependents?: DependentsInput
}

/** 社会保険料（本人負担・年額）の内訳。 */
export interface SocialInsuranceBreakdown {
  /** 健康保険料（本人負担・年額）。 */
  health: number
  /** 介護保険料（本人負担・年額、40〜64歳のみ）。 */
  longTermCare: number
  /** 厚生年金保険料（本人負担・年額）。 */
  pension: number
  /** 雇用保険料（本人負担・年額）。 */
  employment: number
  /** 合計（社会保険料控除額に相当）。 */
  total: number
}

/** 所得控除の内訳。所得税用・住民税用で控除額が異なるため別々に保持する。 */
export interface DeductionsBreakdown {
  /** 基礎控除。 */
  basic: number
  /** 社会保険料控除（社会保険料の本人負担額）。 */
  socialInsurance: number
  /** 配偶者控除＋配偶者特別控除。 */
  spouse: number
  /** 扶養控除。 */
  dependents: number
  /** 特定親族特別控除。 */
  specialRelative: number
  /** 合計。 */
  total: number
}

/** 住民税の内訳。 */
export interface ResidentTaxBreakdown {
  /** 所得割（調整控除適用後・100円未満切捨て後）。 */
  incomePortion: number
  /** 均等割（道府県＋市町村の標準額）。 */
  perCapita: number
  /** 森林環境税（国税・均等割と併徴）。 */
  forestTax: number
  /** 調整控除額（所得割から差し引いた額・参考）。 */
  adjustmentCredit: number
  /** 合計（所得割＋均等割＋森林環境税）。 */
  total: number
}

/** 手取り計算の結果（内訳付き）。 */
export interface TakeHomeResult {
  taxYear: TaxYear
  /** 給与収入（額面年収）。 */
  salaryIncome: number
  /** 給与所得（給与収入−給与所得控除）。 */
  employmentIncome: number
  /** 本人の合計所得金額（給与のみ前提なので給与所得と一致）。 */
  totalIncome: number
  /** 社会保険料（本人負担・年額）。 */
  socialInsurance: SocialInsuranceBreakdown
  /** 所得税の所得控除内訳。 */
  incomeTaxDeductions: DeductionsBreakdown
  /** 住民税の所得控除内訳。 */
  residentTaxDeductions: DeductionsBreakdown
  /** 所得税の課税所得（1,000円未満切捨て後）。 */
  taxableForIncomeTax: number
  /** 住民税の課税標準（1,000円未満切捨て後）。 */
  taxableForResidentTax: number
  /** 所得税（復興特別所得税込み・年額・100円未満切捨て後）。 */
  incomeTax: number
  /** 住民税（所得割＋均等割＋森林環境税）。 */
  residentTax: number
  /** 住民税の内訳。 */
  residentTaxDetail: ResidentTaxBreakdown
  /** 公租公課の合計（所得税＋住民税＋社会保険料）。 */
  totalBurden: number
  /** 手取り（額面年収−公租公課の合計）。 */
  takeHome: number
}
