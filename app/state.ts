import { DEFAULT_TAX_YEAR } from '@core/index'
import type { HousingConstruction, HousingPerformance, TakeHomeInput, TaxYear } from '@core/index'

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

  // ── 拡張控除（Phase 4） ──
  /** 医療費（支払額・保険金等補填・セルフメディケーション購入費）。 */
  medicalPaid: number
  medicalReimbursed: number
  selfMedicationPaid: number
  /** 生命保険料（新/旧 × 一般/介護医療/個人年金）。 */
  lifeGeneralNew: number
  lifeGeneralOld: number
  lifeNursingNew: number
  lifePensionNew: number
  lifePensionOld: number
  /** iDeCo・小規模企業共済等掛金（年額）。 */
  idecoAnnual: number
  /** 住宅ローン控除。 */
  housingEnabled: boolean
  housingMoveInYear: number
  housingConstruction: HousingConstruction
  housingPerformance: HousingPerformance
  housingChildcare: boolean
  housingBalance: number
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
  medicalPaid: 0,
  medicalReimbursed: 0,
  selfMedicationPaid: 0,
  lifeGeneralNew: 0,
  lifeGeneralOld: 0,
  lifeNursingNew: 0,
  lifePensionNew: 0,
  lifePensionOld: 0,
  idecoAnnual: 0,
  housingEnabled: false,
  housingMoveInYear: 2024,
  housingConstruction: 'new',
  housingPerformance: 'certified',
  housingChildcare: false,
  housingBalance: 0,
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
    medicalExpense:
      f.medicalPaid > 0 || f.selfMedicationPaid > 0
        ? { paid: f.medicalPaid, reimbursed: f.medicalReimbursed, selfMedicationPaid: f.selfMedicationPaid }
        : undefined,
    lifeInsurance: hasLifeInsurance(f)
      ? {
          general: { newAmount: f.lifeGeneralNew, oldAmount: f.lifeGeneralOld },
          nursingMedical: { newAmount: f.lifeNursingNew },
          pension: { newAmount: f.lifePensionNew, oldAmount: f.lifePensionOld },
        }
      : undefined,
    idecoAnnual: f.idecoAnnual > 0 ? f.idecoAnnual : undefined,
    housingLoan:
      f.housingEnabled && f.housingBalance > 0
        ? {
            moveInYear: f.housingMoveInYear,
            construction: f.housingConstruction,
            performance: f.housingPerformance,
            childcareHousehold: f.housingChildcare,
            yearEndBalance: f.housingBalance,
          }
        : undefined,
  }
}

function hasLifeInsurance(f: FormState): boolean {
  return f.lifeGeneralNew > 0 || f.lifeGeneralOld > 0 || f.lifeNursingNew > 0 || f.lifePensionNew > 0 || f.lifePensionOld > 0
}
