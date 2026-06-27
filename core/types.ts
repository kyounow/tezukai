/**
 * tezukai コア計算層の入出力型（UI 非依存）。
 *
 * 対象は給与所得者モード・令和7年（2025）。すべて「円」単位の整数で扱う。
 * 計算の年度対応は data/taxTables/sources-2025.md を参照
 * （所得税＝令和7年分／住民税＝令和8年度／給与所得控除は令和7年所得ベース）。
 */

// 対象年度の型は data/taxTables 側（レジストリと同じ出所）から取得し再エクスポートする。
import type { HousingConstruction, HousingPerformance, TaxYear } from '@data/taxTables/types'
export type { TaxYear, HousingConstruction, HousingPerformance }

/** 配偶者の入力。 */
export interface SpouseInput {
  /** 配偶者の給与収入（額面・円）。給与以外の所得は当面未対応。 */
  salaryIncome: number
  /** その年12月31日時点で70歳以上か（老人控除対象配偶者の判定）。 */
  elderly?: boolean
}

/** 扶養親族の入力。 */
export interface DependentsInput {
  /**
   * 年少扶養親族（16歳未満）の人数。
   * 扶養控除は0円（平成23年分以降）だが、個人住民税の非課税限度額の判定では
   * 扶養親族の人数に含まれるため、計算に影響する。
   */
  under16?: number
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

/** 医療費控除の入力（通常 と セルフメディケーションは有利な方を自動採用）。 */
export interface MedicalExpenseInput {
  /** その年に支払った医療費の合計（円）。 */
  paid?: number
  /** 保険金等で補填される金額（円）。 */
  reimbursed?: number
  /** セルフメディケーション税制：特定一般用医薬品等の購入費（円）。 */
  selfMedicationPaid?: number
}

/** 生命保険料控除の1区分の入力（新制度／旧制度の年間支払保険料）。 */
export interface LifeInsuranceCategoryInput {
  /** 新制度（平成24年1月以降契約）の年間支払保険料（円）。 */
  newAmount?: number
  /** 旧制度（平成23年12月以前契約）の年間支払保険料（円）。 */
  oldAmount?: number
}

/** 生命保険料控除の入力（3区分）。 */
export interface LifeInsuranceInput {
  /** 一般生命保険料。 */
  general?: LifeInsuranceCategoryInput
  /** 介護医療保険料（新制度のみ）。 */
  nursingMedical?: LifeInsuranceCategoryInput
  /** 個人年金保険料。 */
  pension?: LifeInsuranceCategoryInput
}

/** 住宅ローン控除の入力。借入限度額は入居年×取得区分×住宅性能で決まる。 */
export interface HousingLoanInput {
  /** 居住開始年（西暦。現行制度は2022〜2025）。 */
  moveInYear: number
  /** 新築・買取再販 / 中古。 */
  construction: HousingConstruction
  /** 住宅の環境性能区分。 */
  performance: HousingPerformance
  /** 子育て世帯・若者夫婦世帯（令和6・7の新築で借入限度額が上乗せ）。 */
  childcareHousehold?: boolean
  /** 年末の住宅ローン残高（円）。 */
  yearEndBalance: number
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
  /** 医療費控除（Phase 4）。 */
  medicalExpense?: MedicalExpenseInput
  /** 生命保険料控除（Phase 4）。 */
  lifeInsurance?: LifeInsuranceInput
  /** iDeCo・小規模企業共済等掛金（年額・全額が所得控除）。 */
  idecoAnnual?: number
  /** 住宅ローン控除（税額控除）。 */
  housingLoan?: HousingLoanInput
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
  /** 医療費控除（Phase 4）。 */
  medical: number
  /** 生命保険料控除（Phase 4）。 */
  lifeInsurance: number
  /** 小規模企業共済等掛金控除（iDeCo 等・Phase 4）。 */
  smallEnterprise: number
  /** 合計。 */
  total: number
}

/** 住宅ローン控除（税額控除）の内訳。 */
export interface HousingLoanCreditBreakdown {
  /** 控除可能額（年末残高×0.7%、借入限度内）。 */
  available: number
  /** 所得税から控除した額。 */
  appliedToIncomeTax: number
  /** 住民税所得割から控除した額（繰越上限内）。 */
  appliedToResidentTax: number
  /** 実際に控除された合計。 */
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
  /** 所得税（住宅ローン控除適用後・復興特別所得税込み・年額・100円未満切捨て後）。 */
  incomeTax: number
  /** 住民税（所得割＋均等割＋森林環境税。住宅ローン控除の住民税繰越分を反映後）。 */
  residentTax: number
  /**
   * 住民税の内訳。incomePortion は調整控除後・**住宅ローン控除前**の所得割
   * （ふるさと納税の特例控除20%の基礎となる額）。住宅ローン控除の住民税分は
   * housingLoanCredit.appliedToResidentTax で別途差し引く。
   */
  residentTaxDetail: ResidentTaxBreakdown
  /** 住宅ローン控除（税額控除）の内訳。 */
  housingLoanCredit: HousingLoanCreditBreakdown
  /** 公租公課の合計（所得税＋住民税＋社会保険料）。 */
  totalBurden: number
  /** 手取り（額面年収−公租公課の合計）。 */
  takeHome: number
}
