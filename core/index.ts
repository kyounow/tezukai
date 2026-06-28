/**
 * tezukai コア計算層の公開 API。UI（app/）はここから import する。
 * 計算は純粋関数のみ。年度データは data/taxTables に分離。
 */
export { calculateTakeHome } from './takeHome'
export { furusatoLimit, furusatoFromResult, furusatoActual, marginalIncomeTaxRate, FURUSATO_SELF_BURDEN } from './furusato/furusato'
export type { FurusatoResult, FurusatoActualResult } from './furusato/furusato'
export { employmentIncome, employmentIncomeDeduction } from './income/employmentIncome'
export { otherIncomeTotal } from './income/otherIncome'
export { incomeAdjustmentDeduction } from './income/incomeAdjustment'
export { businessIncome, businessProfit } from './income/businessIncome'
export { socialInsurance } from './insurance/socialInsurance'
export { nationalInsurance } from './insurance/nationalInsurance'
export { baseIncomeTax, incomeTaxWithSurtax } from './tax/incomeTax'
export { residentTax, adjustmentCredit } from './tax/residentTax'
export {
  basicDeduction,
  spouseDeduction,
  dependentDeduction,
  specialRelativeDeduction,
  type TaxKind,
} from './deductions/deductions'
export {
  medicalExpenseDeduction,
  medicalExpenseDetail,
  lifeInsuranceDeduction,
  earthquakeInsuranceDeduction,
  smallEnterpriseDeduction,
} from './deductions/extraDeductions'
export { housingLoanLimit, housingLoanAvailableCredit } from './deductions/housingLoan'

export type {
  TaxYear,
  TakeHomeInput,
  TakeHomeResult,
  SalaryBreakdown,
  SpouseInput,
  DependentsInput,
  SocialInsuranceBreakdown,
  DeductionsBreakdown,
  ResidentTaxBreakdown,
  MedicalExpenseInput,
  MedicalMethod,
  LifeInsuranceInput,
  LifeInsuranceCategoryInput,
  EarthquakeInsuranceInput,
  HousingLoanInput,
  HousingLoanCreditBreakdown,
  HousingConstruction,
  HousingPerformance,
  OtherIncomeInput,
  IncomeAdjustmentInput,
  TaxpayerMode,
  BlueDeduction,
  BusinessInput,
  HealthInsuranceInput,
} from './types'

// 年度別ルールセット（法改正対応）のレジストリを UI 向けに再エクスポート。
export { getTaxTable, TAX_TABLES, AVAILABLE_TAX_YEARS, DEFAULT_TAX_YEAR, LATEST_TAX_YEAR } from '@data/taxTables/index'
export type { TaxTable } from '@data/taxTables/types'
