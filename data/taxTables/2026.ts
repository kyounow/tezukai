/**
 * 令和8年（2026）税率・控除データ。
 *
 * 税（基礎控除95/88/68/63/58・給与所得控除65万・所得税速算表・住民税）は令和7年分と同じため
 * 2025.ts の定数を再利用し、令和8で変わる項目だけを上書きする。
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
import {
  BASIC_DEDUCTION_INCOME_TAX_2025,
  EARTHQUAKE_INSURANCE_2025,
  NATIONAL_HEALTH_INSURANCE_2025,
  BASIC_DEDUCTION_RESIDENT_TAX_2025,
  DEPENDENT_DEDUCTION_2025,
  EMPLOYMENT_INCOME_DEDUCTION_2025,
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
  SPOUSE_DEDUCTION_INCOME_LIMIT,
  SPOUSE_OWNER_INCOME_TIERS,
  SPOUSE_SPECIAL_DEDUCTION_2025,
  SPOUSE_SPECIAL_DEDUCTION_INCOME_LIMIT,
} from './2025'

export const TAX_YEAR_2026 = 2026 as const

// 社会保険料（令和8年度・協会けんぽ東京）。子ども・子育て支援金0.23%は健保に上乗せ。
const SOCIAL_INSURANCE_2026: SocialInsuranceConfig = {
  health: { rate: 0.0985, childSupportRate: 0.0023 },
  longTermCare: { rate: 0.0162, minAge: 40, maxAge: 64 },
  pension: { rate: 0.183 },
  employment: { employeeRate: 0.005 },
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
  period: { new: 13, used: 13 },
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
  employmentIncomeDeduction: EMPLOYMENT_INCOME_DEDUCTION_2025,
  incomeTaxBrackets: INCOME_TAX_BRACKETS_2025,
  reconstructionSurtaxRate: RECONSTRUCTION_SURTAX_RATE,
  basicDeduction: { incomeTax: BASIC_DEDUCTION_INCOME_TAX_2025, residentTax: BASIC_DEDUCTION_RESIDENT_TAX_2025 },
  ownerIncomeTiers: SPOUSE_OWNER_INCOME_TIERS,
  spouseDeductionIncomeLimit: SPOUSE_DEDUCTION_INCOME_LIMIT,
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
