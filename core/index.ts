/**
 * tezukai コア計算層の公開 API。UI（app/）はここから import する。
 * 計算は純粋関数のみ。年度データは data/taxTables に分離。
 */
export { calculateTakeHome } from './takeHome'
export { employmentIncome, employmentIncomeDeduction } from './income/employmentIncome'
export { socialInsurance } from './insurance/socialInsurance'
export { baseIncomeTax, incomeTaxWithSurtax } from './tax/incomeTax'
export { residentTax, adjustmentCredit } from './tax/residentTax'
export {
  basicDeduction,
  spouseDeduction,
  dependentDeduction,
  specialRelativeDeduction,
  type TaxKind,
} from './deductions/deductions'

export type {
  TaxYear,
  TakeHomeInput,
  TakeHomeResult,
  SpouseInput,
  DependentsInput,
  SocialInsuranceBreakdown,
  DeductionsBreakdown,
  ResidentTaxBreakdown,
} from './types'
