import { LATEST_TAX_YEAR } from '@core/index'
import type { BlueDeduction, HousingConstruction, HousingPerformance, TakeHomeInput, TaxpayerMode, TaxYear } from '@core/index'

/** 入力フォームの状態（UI 都合の平坦な構造）。 */
export interface FormState {
  /** 対象年度（税制ルールセットの選択）。 */
  taxYear: TaxYear
  /** 納税者区分（給与所得者／個人事業主）。 */
  mode: TaxpayerMode
  /** 事業収入（個人事業主）。 */
  busRevenue: number
  /** 必要経費（個人事業主）。 */
  busExpenses: number
  /** 青色申告特別控除の区分。 */
  blueDeduction: BlueDeduction
  /** 国民健康保険の加入人数。 */
  kokuhoMembers: number
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
  /** 健康保険の種類（協会けんぽ／組合健保）。 */
  healthInsuranceType: 'kyokai' | 'kumiai'
  /** 組合健保の本人負担の健康保険料率（%）。 */
  kumiaiHealthRatePct: number
  /** 組合健保の本人負担の介護保険料率（%・40〜64歳）。 */
  kumiaiCareRatePct: number
  /** 組合健保の本人負担の子ども・子育て支援金率（%・令和8年度〜）。 */
  kumiaiChildSupportRatePct: number

  // ── 育児休業（給与所得者モード） ──
  /** 育児休業を取得する。 */
  childcareLeave: boolean
  /** 育休開始日（YYYY-MM-DD）。 */
  childcareLeaveStart: string
  /** 育休終了日（YYYY-MM-DD）。 */
  childcareLeaveEnd: string
  /** 育休前の月給（賃金日額・給与減の基礎・円）。 */
  childcareLeavePreSalary: number
  /** 出生後休業支援給付金（両親とも14日以上育休）。 */
  childcarePostBirthSupport: boolean
  /** 賞与の社会保険料も免除（賞与月末を含む連続1か月超の育休）。 */
  childcareExemptBonus: boolean
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
  /** 特定扶養親族（19〜22歳・合計所得が要件以下＝令和7は58万・令和8〜は62万）の人数。 */
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
  /** 地震保険料（年間支払額・円）。 */
  earthquakePaid: number
  /** 旧長期損害保険料（年間支払額・円。平成18年末までに締結）。 */
  oldLongTermPaid: number
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

  // ── ふるさと納税の実績シミュレーション ──
  /** 今年寄附したふるさと納税の合計額（円）。 */
  furusatoDonation: number
  /** 控除方式（ワンストップ特例 / 確定申告）。 */
  furusatoMethod: FurusatoMethod

  // ── 住民税の自治体差 ──
  /** 非課税限度額の級地区分（1=1級地〔東京23区・政令市等〕/2/3）。 */
  residentGradeLevel: 1 | 2 | 3
  /** 均等割額の上書き（市区町村＋都道府県・円。森林環境税を除く）。null＝未入力＝年度テーブルの標準額。 */
  residentPerCapita: number | null
}

/** ふるさと納税の控除方式。 */
export type FurusatoMethod = 'oneStop' | 'filing'

export const defaultForm: FormState = {
  taxYear: LATEST_TAX_YEAR,
  mode: 'employee',
  busRevenue: 5_000_000,
  busExpenses: 1_500_000,
  blueDeduction: '65',
  kokuhoMembers: 1,
  salaryIncome: 5_000_000,
  bonusMode: false,
  monthlySalary: 300_000,
  annualBonus: 1_000_000,
  bonusCount: 2,
  // 組合健保の初期値（プリセット）に使う本人負担料率。協会けんぽに切替も可。
  // 数値の出典: NTT健保 公式「R8.4.1～ 保険料・掛金額（一般）本人負担分」
  //   健保 45.6/1000(4.56%)・介護 7.7/1000(0.77%)・子ども子育て支援金 1.15/1000(0.115%)。
  //   https://www.nttkenpo.jp/member/outline/files/getsugaku.pdf
  healthInsuranceType: 'kumiai',
  kumiaiHealthRatePct: 4.56,
  kumiaiCareRatePct: 0.77,
  kumiaiChildSupportRatePct: 0.115,
  childcareLeave: false,
  childcareLeaveStart: '',
  childcareLeaveEnd: '',
  childcareLeavePreSalary: 300_000,
  childcarePostBirthSupport: false,
  childcareExemptBonus: false,
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
  earthquakePaid: 0,
  oldLongTermPaid: 0,
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
  furusatoDonation: 0,
  furusatoMethod: 'oneStop',
  residentGradeLevel: 1,
  residentPerCapita: null,
}

/** フォーム状態をコア計算の入力に変換する。 */
export function toInput(f: FormState): TakeHomeInput {
  const salaryIncome = f.bonusMode ? f.monthlySalary * 12 + f.annualBonus : f.salaryIncome
  const sole = f.mode === 'soleProprietor'
  return {
    taxYear: f.taxYear,
    mode: f.mode,
    salaryIncome,
    business: sole ? { revenue: f.busRevenue, expenses: f.busExpenses, blueDeduction: f.blueDeduction } : undefined,
    kokuhoMembers: sole ? f.kokuhoMembers : undefined,
    salaryBreakdown: f.bonusMode
      ? { monthlySalary: f.monthlySalary, annualBonus: f.annualBonus, bonusCount: f.bonusCount }
      : undefined,
    healthInsurance:
      !sole && f.healthInsuranceType === 'kumiai'
        ? {
            type: 'kumiai',
            kumiaiHealthRate: f.kumiaiHealthRatePct / 100,
            kumiaiCareRate: f.kumiaiCareRatePct / 100,
            // 子ども・子育て支援金は令和8年度（2026）〜
            kumiaiChildSupportRate: f.taxYear >= 2026 ? f.kumiaiChildSupportRatePct / 100 : 0,
          }
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
    childcareLeave:
      !sole && f.childcareLeave && f.childcareLeaveStart && f.childcareLeaveEnd
        ? {
            startDate: f.childcareLeaveStart,
            endDate: f.childcareLeaveEnd,
            preMonthlySalary: f.childcareLeavePreSalary,
            postBirthSupport: f.childcarePostBirthSupport,
            exemptBonus: f.childcareExemptBonus,
          }
        : undefined,
    earthquakeInsurance:
      f.earthquakePaid > 0 || f.oldLongTermPaid > 0
        ? { earthquake: f.earthquakePaid, oldLongTerm: f.oldLongTermPaid }
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
    residentGradeLevel: f.residentGradeLevel,
    // 未入力(null)は年度テーブルの標準均等割を採用（residentTax 側で ?? rt.perCapita.total）。
    residentPerCapitaOverride: f.residentPerCapita ?? undefined,
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
