import { LATEST_TAX_YEAR } from '@core/index'
import type { HousingConstruction, HousingPerformance, TakeHomeInput, TaxYear } from '@core/index'

/** 入力フォームの状態（UI 都合の平坦な構造）。 */
export interface FormState {
  /** 対象年度（税制ルールセットの選択）。 */
  taxYear: TaxYear
  /** 額面年収（円。簡易モード用）。 */
  salaryIncome: number
  /** 賞与分離モード（社保を月給＋賞与で精密計算）。 */
  bonusMode: boolean
  /** 月給（月額・円。賞与分離モード用）。 */
  monthlySalary: number
  /** 年間賞与（円。賞与分離モード用）。 */
  annualBonus: number
  /** 賞与の支給回数。 */
  bonusCount: number
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
  /** 子育て世帯（23歳未満扶養）。令和8の一般生命保険(新)の拡充に使用。 */
  lifeChildcare: boolean
  /** iDeCo・小規模企業共済等掛金（年額）。 */
  idecoAnnual: number
  /** 住宅ローン控除。 */
  housingEnabled: boolean
  housingMoveInYear: number
  housingConstruction: HousingConstruction
  housingPerformance: HousingPerformance
  housingChildcare: boolean
  housingBalance: number

  // ── 給与以外の所得（総合課税・損益通算） ──
  otherBusiness: number
  otherRealEstate: number
  otherMisc: number
  otherDividend: number
  otherTemporary: number
  otherShortCapital: number
  otherLongCapital: number
  // ── 所得金額調整控除（850万超）の条件 ──
  adjYoungDependent: boolean
  adjSelfDisability: boolean
  adjFamilyDisability: boolean
}

export const defaultForm: FormState = {
  taxYear: LATEST_TAX_YEAR,
  salaryIncome: 5_000_000,
  bonusMode: false,
  monthlySalary: 300_000,
  annualBonus: 1_000_000,
  bonusCount: 2,
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
  lifeChildcare: false,
  idecoAnnual: 0,
  housingEnabled: false,
  housingMoveInYear: 2024,
  housingConstruction: 'new',
  housingPerformance: 'certified',
  housingChildcare: false,
  housingBalance: 0,
  otherBusiness: 0,
  otherRealEstate: 0,
  otherMisc: 0,
  otherDividend: 0,
  otherTemporary: 0,
  otherShortCapital: 0,
  otherLongCapital: 0,
  adjYoungDependent: false,
  adjSelfDisability: false,
  adjFamilyDisability: false,
}

/** フォーム状態をコア計算の入力に変換する。 */
export function toInput(f: FormState): TakeHomeInput {
  const salaryIncome = f.bonusMode ? f.monthlySalary * 12 + f.annualBonus : f.salaryIncome
  return {
    taxYear: f.taxYear,
    salaryIncome,
    salaryBreakdown: f.bonusMode
      ? { monthlySalary: f.monthlySalary, annualBonus: f.annualBonus, bonusCount: f.bonusCount }
      : undefined,
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
          childcareHousehold: f.lifeChildcare,
        }
      : undefined,
    idecoAnnual: f.idecoAnnual > 0 ? f.idecoAnnual : undefined,
    otherIncome: hasOtherIncome(f)
      ? {
          business: f.otherBusiness,
          realEstate: f.otherRealEstate,
          miscellaneous: f.otherMisc,
          dividend: f.otherDividend,
          temporary: f.otherTemporary,
          generalShortTermCapital: f.otherShortCapital,
          generalLongTermCapital: f.otherLongCapital,
        }
      : undefined,
    incomeAdjustment:
      f.adjYoungDependent || f.adjSelfDisability || f.adjFamilyDisability
        ? {
            hasYoungDependent: f.adjYoungDependent,
            selfSpecialDisability: f.adjSelfDisability,
            specialDisabilityFamily: f.adjFamilyDisability,
          }
        : undefined,
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

function hasOtherIncome(f: FormState): boolean {
  return (
    f.otherBusiness !== 0 ||
    f.otherRealEstate !== 0 ||
    f.otherMisc !== 0 ||
    f.otherDividend !== 0 ||
    f.otherTemporary !== 0 ||
    f.otherShortCapital !== 0 ||
    f.otherLongCapital !== 0
  )
}
