/**
 * 令和8年（2026）税率・控除データ。
 *
 * **令和8年度税制改正（令和8年12月1日施行・令和8年分以後に適用）を反映**。所得税速算表・住民税は
 * 令和7年分と同じため 2025.ts を再利用し、令和8改正で変わる項目（基礎控除・給与所得控除・所得要件）と
 * 令和8で変わる項目だけを上書きする。
 *   - 基礎控除（所得税・令和8/9年分）: 本則58万→62万。上乗せ特例で 合計所得489万以下=104万／
 *     489超655万=67万／655超2350万=62万（いわゆる「178万円の壁」）。出典: 国税庁「令和8年4月源泉所得税の改正のあらまし」、財務省 令和8年度税制改正。
 *   - 給与所得控除: 最低保障 65万→74万（本則69万＋令和8/9年分の特例5万）。
 *   - 配偶者・扶養の合計所得要件: 58万→62万（控除額・段階表は不変、所得要件のみ変更）。
 *   - 住民税の基礎控除（43万）・調整控除の人的控除差（5万近似）は令和8で据置（2025を再利用）。
 *   - 社会保険料（令和8年度）: 協会けんぽ東京 健保9.85%・介護1.62%・雇用5/1000、
 *     子ども・子育て支援金率0.23%（新設）。出典: 協会けんぽ R8 保険料額表、厚労省 R8 雇用保険料率。
 *   - 生命保険料控除: 子育て世帯（23歳未満扶養）の一般生命保険(新)の所得税上限を6万円に拡充
 *     （令和8年分のみ）。出典: 財務省 令和7年度税制改正の大綱、国税庁。
 *   - 住宅ローン控除: 令和8入居の借入限度（新築省エネ通常2000万、中古は子育て上乗せ＋13年化）。
 *     出典: 財務省 令和8年度税制改正パンフレット、国交省。
 * 詳細は data/taxTables/sources-2026.md を参照。
 */
import type {
  HousingLoanConfig,
  LifeInsuranceConfig,
  NationalPensionConfig,
  SocialInsuranceConfig,
  TaxTable,
} from './types'
import type { AmountByIncomeBand, DeductionBracket } from './2025'
import {
  EARTHQUAKE_INSURANCE_2025,
  NATIONAL_HEALTH_INSURANCE_2025,
  BASIC_DEDUCTION_RESIDENT_TAX_2025,
  DEPENDENT_DEDUCTION_2025,
  HEALTH_GRADES_2025,
  HOUSING_LOAN_2025,
  HUMAN_DEDUCTION_DIFF_2025,
  INCOME_TAX_BRACKETS_2025,
  LIFE_INSURANCE_2025,
  MEDICAL_EXPENSE_2025,
  PENSION_GRADES_2025,
  RECONSTRUCTION_SURTAX_RATE,
  RESIDENT_TAX_2025,
  RESIDENT_TAX_NON_TAXABLE_2025,
  SPECIAL_RELATIVE_DEDUCTION_2025,
  SPOUSE_DEDUCTION_2025,
  SPOUSE_OWNER_INCOME_TIERS,
  SPOUSE_SPECIAL_DEDUCTION_2025,
  SPOUSE_SPECIAL_DEDUCTION_INCOME_LIMIT,
} from './2025'

export const TAX_YEAR_2026 = 2026 as const

// ── 令和8年度改正で変わる所得税の控除（令和8・令和9年分で共通。2027.ts も再利用）──

/**
 * 所得税の基礎控除（令和8・令和9年分）。本則62万＋上乗せ特例。
 * 出典: 国税庁「令和8年4月源泉所得税の改正のあらまし」（合計所得489万以下=104万／489超655万=67万／
 * 655超2350万=62万／2350超2400万=48万／2400超2450万=32万／2450超2500万=16万／2500万超=0）。
 * 注: 令和10年分以後は ≤132万=99万・それ超〜2350万=62万 に変わる（時限特例終了）。
 */
export const BASIC_DEDUCTION_INCOME_TAX_2026: readonly AmountByIncomeBand[] = [
  { upTo: 4_890_000, amount: 1_040_000 },
  { upTo: 6_550_000, amount: 670_000 },
  { upTo: 23_500_000, amount: 620_000 },
  { upTo: 24_000_000, amount: 480_000 },
  { upTo: 24_500_000, amount: 320_000 },
  { upTo: 25_000_000, amount: 160_000 },
  { upTo: null, amount: 0 },
]

/**
 * 給与所得控除（令和8・令和9年分）。最低保障 65万→74万（本則69万＋令和8/9特例5万）。
 * 74万＝給与収入220万で 30%×収入+8万 と一致するため、220万までが最低保障。以降は令和7と同じ。
 * 出典: 国税庁「令和8年4月源泉所得税の改正のあらまし」。
 */
export const EMPLOYMENT_INCOME_DEDUCTION_2026: readonly DeductionBracket[] = [
  { upTo: 2_200_000, rate: 0, plus: 740_000 },
  { upTo: 3_600_000, rate: 0.3, plus: 80_000 },
  { upTo: 6_600_000, rate: 0.2, plus: 440_000 },
  { upTo: 8_500_000, rate: 0.1, plus: 1_100_000 },
  { upTo: null, rate: 0, plus: 1_950_000 },
]

/** 配偶者控除/配偶者特別控除の判定境界（令和8改正: 58万→62万。控除額・段階表は不変）。 */
export const SPOUSE_DEDUCTION_INCOME_LIMIT_2026 = 620_000

// 社会保険料（令和8年度・協会けんぽ東京）。子ども・子育て支援金0.23%は健保に上乗せ。
const SOCIAL_INSURANCE_2026: SocialInsuranceConfig = {
  health: { rate: 0.0985, childSupportRate: 0.0023 },
  longTermCare: { rate: 0.0162, minAge: 40, maxAge: 64 },
  pension: { rate: 0.183, maxAge: 70 }, // 厚年は70歳到達で資格喪失
  employment: { employeeRate: 0.005 },
  latterStageElderlyAge: 75, // 75歳で後期高齢者医療へ移行（健保の給与天引きなし）
}

// 生命保険料控除（令和8年分・子育て世帯の一般生命保険(新)の所得税上限6万円）
// 出典: 3万以下=全額／3万超6万=×1/2+1.5万／6万超12万=×1/4+3万／12万超=6万。
const LIFE_INSURANCE_2026: LifeInsuranceConfig = {
  ...LIFE_INSURANCE_2025,
  childcareGeneralNew: {
    incomeTax: [
      { upTo: 30_000, rate: 1, plus: 0 },
      { upTo: 60_000, rate: 0.5, plus: 15_000 },
      { upTo: 120_000, rate: 0.25, plus: 30_000 },
      { upTo: null, rate: 0, plus: 60_000 },
    ],
    combinedCap: 60_000,
  },
}

// 住宅ローン控除：令和4〜7入居は令和7テーブルを再利用し、令和8入居を追加。
const HOUSING_LOAN_2026: HousingLoanConfig = {
  creditRate: 0.007,
  incomeLimit: 20_000_000,
  residentCarryover: { rate: 0.05, cap: 97_500 },
  period: { new: 13, used: 10 }, // 中古（既存住宅）は一律10年（国税庁 No.1211-3）

  limits: {
    new: {
      ...HOUSING_LOAN_2025.limits.new,
      2026: { certified: 45_000_000, zeh: 35_000_000, energySaving: 20_000_000, other: 0 },
    },
    newChildcare: {
      ...HOUSING_LOAN_2025.limits.newChildcare,
      2026: { certified: 50_000_000, zeh: 45_000_000, energySaving: 30_000_000, other: 0 },
    },
    used: HOUSING_LOAN_2025.limits.used,
    usedByYear: {
      2026: {
        standard: { certified: 35_000_000, zeh: 35_000_000, energySaving: 20_000_000, other: 20_000_000 },
        childcare: { certified: 45_000_000, zeh: 45_000_000, energySaving: 30_000_000, other: 20_000_000 },
      },
    },
  },
}

// 国民年金（令和8年度・定額）。出典: 日本年金機構（月額17,920円）。
// 国民健康保険は令和8年度の特別区率が未取得のため令和7年度を再利用（近似・TODO）。
const NATIONAL_PENSION_2026: NationalPensionConfig = { annual: 215_040 } // 17,920円×12

export const TAX_TABLE_2026: TaxTable = {
  year: TAX_YEAR_2026,
  employmentIncomeDeduction: EMPLOYMENT_INCOME_DEDUCTION_2026, // 令和8改正: 最低保障74万
  incomeTaxBrackets: INCOME_TAX_BRACKETS_2025,
  reconstructionSurtaxRate: RECONSTRUCTION_SURTAX_RATE,
  // 令和8改正: 所得税の基礎控除を新ティアに。住民税の基礎控除(43万)は据置。
  basicDeduction: { incomeTax: BASIC_DEDUCTION_INCOME_TAX_2026, residentTax: BASIC_DEDUCTION_RESIDENT_TAX_2025 },
  ownerIncomeTiers: SPOUSE_OWNER_INCOME_TIERS,
  spouseDeductionIncomeLimit: SPOUSE_DEDUCTION_INCOME_LIMIT_2026, // 令和8改正: 58万→62万
  spouseSpecialDeductionIncomeLimit: SPOUSE_SPECIAL_DEDUCTION_INCOME_LIMIT,
  spouseDeduction: SPOUSE_DEDUCTION_2025,
  spouseSpecialDeduction: SPOUSE_SPECIAL_DEDUCTION_2025,
  dependentDeduction: DEPENDENT_DEDUCTION_2025,
  specialRelativeDeduction: SPECIAL_RELATIVE_DEDUCTION_2025,
  residentTax: RESIDENT_TAX_2025,
  residentTaxNonTaxable: RESIDENT_TAX_NON_TAXABLE_2025,
  humanDeductionDiff: HUMAN_DEDUCTION_DIFF_2025,
  socialInsurance: SOCIAL_INSURANCE_2026,
  healthGrades: HEALTH_GRADES_2025,
  pensionGrades: PENSION_GRADES_2025,
  medicalExpense: MEDICAL_EXPENSE_2025,
  lifeInsurance: LIFE_INSURANCE_2026,
  earthquakeInsurance: EARTHQUAKE_INSURANCE_2025,
  housingLoan: HOUSING_LOAN_2026,
  nationalPension: NATIONAL_PENSION_2026,
  nationalHealthInsurance: NATIONAL_HEALTH_INSURANCE_2025,
}
