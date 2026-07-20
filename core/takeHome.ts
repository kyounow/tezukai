import { DEFAULT_TAX_YEAR, getTaxTable } from '@data/taxTables/index'
import type { TaxTable } from '@data/taxTables/types'
import { employmentIncome } from './income/employmentIncome'
import { incomeAdjustmentDeduction } from './income/incomeAdjustment'
import { otherIncomeTotal } from './income/otherIncome'
import { businessIncome, businessProfit } from './income/businessIncome'
import { computeChildcareLeave } from './childcareLeave'
import { socialInsurance } from './insurance/socialInsurance'
import { nationalInsurance } from './insurance/nationalInsurance'
import {
  basicDeduction,
  dependentDeduction,
  familyDisabilityDeduction,
  personalDeduction,
  specialRelativeDeduction,
  spouseDeduction,
  spouseTotalIncome,
  type TaxKind,
} from './deductions/deductions'
import {
  earthquakeInsuranceDeduction,
  lifeInsuranceDeduction,
  medicalExpenseDeduction,
  medicalExpenseDetail,
  smallEnterpriseDeduction,
} from './deductions/extraDeductions'
import { housingLoanAvailableCredit } from './deductions/housingLoan'
import { baseIncomeTax } from './tax/incomeTax'
import { residentTax } from './tax/residentTax'
import { floorTo1000, floorTo100 } from './util/rounding'
import type {
  DeductionsBreakdown,
  HousingLoanCreditBreakdown,
  SocialInsuranceBreakdown,
  TakeHomeInput,
  TakeHomeResult,
} from './types'

/** 特定親族特別控除の上位帯（合計所得95万以下）の人的控除差は特定扶養と同じ18万で近似。 */
const SPECIAL_RELATIVE_DIFF_INCOME_LIMIT = 950_000

/**
 * 社会保険料の実額オーバーライド（実額モード）の内訳を作る。
 * 内訳4区分（健保/介護/厚年/雇用）は0とし、total にクランプ済みの実額、source に 'actual' を入れる。
 * 負値・小数は Math.max(0, Math.floor()) でクランプする。
 */
function actualSocialInsurance(total: number): SocialInsuranceBreakdown {
  const clamped = Math.max(0, Math.floor(total))
  return { health: 0, longTermCare: 0, pension: 0, employment: 0, total: clamped, source: 'actual' }
}

function buildDeductions(
  kind: TaxKind,
  totalIncome: number,
  socialInsuranceTotal: number,
  input: TakeHomeInput,
  table: TaxTable,
): DeductionsBreakdown {
  const basic = basicDeduction(totalIncome, kind, table)
  const spouse = input.spouse ? spouseDeduction(totalIncome, input.spouse, kind, table) : 0
  const dependents = input.dependents ? dependentDeduction(input.dependents, kind, table) : 0
  const specialRelative = input.dependents?.specialRelativeIncomes
    ? specialRelativeDeduction(input.dependents.specialRelativeIncomes, kind, table)
    : 0
  // 属性による所得控除＝本人（personalDeduction）＋同一生計配偶者・扶養親族の障害者（familyDisabilityDeduction）。
  const personal =
    (input.personal ? personalDeduction(input.personal, totalIncome, kind, table) : 0) +
    (input.familyDisability ? familyDisabilityDeduction(input.familyDisability, kind, table) : 0)
  const medical = input.medicalExpense ? medicalExpenseDeduction(input.medicalExpense, totalIncome, table) : 0
  const lifeInsurance = input.lifeInsurance ? lifeInsuranceDeduction(input.lifeInsurance, kind, table) : 0
  const earthquake = input.earthquakeInsurance ? earthquakeInsuranceDeduction(input.earthquakeInsurance, kind, table) : 0
  const smallEnterprise = input.idecoAnnual ? smallEnterpriseDeduction(input.idecoAnnual) : 0
  const total =
    basic +
    socialInsuranceTotal +
    spouse +
    dependents +
    specialRelative +
    personal +
    medical +
    lifeInsurance +
    earthquake +
    smallEnterprise
  return {
    basic,
    socialInsurance: socialInsuranceTotal,
    spouse,
    dependents,
    specialRelative,
    personal,
    medical,
    lifeInsurance,
    earthquake,
    smallEnterprise,
    total,
  }
}

/** 調整控除に用いる人的控除額の差の合計（主要控除のみ・近似。sources-2025.md 参照）。 */
function humanDeductionDiffSum(totalIncome: number, input: TakeHomeInput, table: TaxTable): number {
  const D = table.humanDeductionDiff
  let sum = 0
  if (totalIncome <= 24_000_000) sum += D.basic

  if (input.spouse && totalIncome <= 10_000_000) {
    const spouseIncome = spouseTotalIncome(input.spouse, table)
    if (spouseIncome <= table.spouseDeductionIncomeLimit) {
      sum += input.spouse.elderly ? D.spouseElderly : D.spouseGeneral
    } else if (spouseIncome <= SPECIAL_RELATIVE_DIFF_INCOME_LIMIT) {
      sum += D.spouseSpecial
    }
  }

  const d = input.dependents
  if (d) {
    sum +=
      (d.general ?? 0) * D.dependentGeneral +
      (d.specified ?? 0) * D.dependentSpecified +
      (d.elderlyOther ?? 0) * D.dependentElderlyOther +
      (d.elderlyCoLiving ?? 0) * D.dependentCoLiving
    for (const income of d.specialRelativeIncomes ?? []) {
      if (income > table.spouseDeductionIncomeLimit && income <= SPECIAL_RELATIVE_DIFF_INCOME_LIMIT) {
        sum += D.dependentSpecified
      }
    }
  }

  // 本人の属性（障害者・ひとり親・寡婦・勤労学生）。personalDeduction と同じ所得要件で判定する。
  const p = input.personal
  if (p) {
    const pc = table.personalDeduction
    if (p.disability === 'special') sum += D.disabilitySpecial
    else if (p.disability === 'normal') sum += D.disabilityNormal
    if (p.singleParent) {
      if (totalIncome <= pc.singleParentWidowIncomeLimit) sum += D.singleParent
    } else if (p.widow) {
      if (totalIncome <= pc.singleParentWidowIncomeLimit) sum += D.widow
    }
    if (p.workingStudent && totalIncome <= pc.workingStudentIncomeLimit) sum += D.workingStudent
  }

  // 同一生計配偶者・扶養親族の障害者（所得要件なし）。
  const fd = input.familyDisability
  if (fd) {
    sum +=
      (fd.normal ?? 0) * D.disabilityNormal +
      (fd.special ?? 0) * D.disabilitySpecial +
      (fd.coLivingSpecial ?? 0) * D.disabilityCoLivingSpecial
  }
  return sum
}

/**
 * 住民税の135万円非課税（地方税法295条）の対象者か。
 * 障害者・寡婦・ひとり親、または未成年者（18歳未満＝現在の年齢で近似判定）。勤労学生は対象外。
 */
function isPersonalNonTaxableEligible(input: TakeHomeInput): boolean {
  const p = input.personal
  const isMinor = input.age < 18
  return isMinor || !!(p && (p.singleParent || p.widow || (p.disability && p.disability !== 'none')))
}

/** 住民税の非課税限度額判定に使う「本人を除く人数」（合計所得58万円以下の同一生計配偶者＋扶養親族）。 */
function nonTaxableDependentCount(input: TakeHomeInput, table: TaxTable): number {
  let count = 0
  if (input.spouse && spouseTotalIncome(input.spouse, table) <= table.spouseDeductionIncomeLimit) {
    count += 1
  }
  const d = input.dependents
  if (d) {
    // 16歳未満（年少扶養）も非課税限度額の扶養親族数に含まれる（扶養控除は0でも）。
    count += (d.under16 ?? 0) + (d.general ?? 0) + (d.specified ?? 0) + (d.elderlyCoLiving ?? 0) + (d.elderlyOther ?? 0)
  }
  return count
}

/**
 * 年収 → 手取り（内訳付き）を計算する Phase 1 のオーケストレータ。
 *
 * 計算順序: 給与所得控除 → 社会保険料 → 所得控除（社保控除込み）→ 課税所得
 *   → 所得税（復興特別込み）／住民税（所得割＋均等割＋森林環境税）→ 手取り。
 * 適用ルールは input.taxYear（省略時 DEFAULT_TAX_YEAR）の TaxTable で切り替わる。
 * 給与所得者前提。給与以外の所得は未対応。
 */
export function calculateTakeHome(input: TakeHomeInput): TakeHomeResult {
  const table = getTaxTable(input.taxYear ?? DEFAULT_TAX_YEAR)
  const mode = input.mode ?? 'employee'
  const rawSalary = mode === 'employee' ? Math.max(0, Math.floor(input.salaryIncome)) : 0
  // 育児休業: 給与減・育休給付金（非課税）・社保免除月数を算出（給与所得者のみ）。
  const childcare =
    mode === 'employee' && input.childcareLeave && table.childcareLeaveBenefit
      ? computeChildcareLeave(input.childcareLeave, table.childcareLeaveBenefit, table.year)
      : undefined
  // 課税給与収入は育休日数ぶん減額。育休給付金は非課税で後段で手取りに加算。
  const salaryIncome = childcare ? Math.max(0, rawSalary - childcare.salaryReduction) : rawSalary

  // 本業の所得（実額モードでは別表第五＝電算機特例で給与所得を算出できる）
  const empIncome = mode === 'employee' ? employmentIncome(salaryIncome, table, input.employmentIncomeMethod) : 0
  const incomeAdjust =
    mode === 'employee' && input.incomeAdjustment ? incomeAdjustmentDeduction(salaryIncome, input.incomeAdjustment) : 0
  const busProfit = mode === 'soleProprietor' && input.business ? businessProfit(input.business) : 0
  const busIncome = mode === 'soleProprietor' && input.business ? businessIncome(input.business) : 0
  const otherTotal = input.otherIncome ? otherIncomeTotal(input.otherIncome) : 0

  // 合計所得 = 給与所得−調整控除 ＋ 事業所得 ＋ 給与以外の所得（損益通算後）
  const totalIncome = Math.max(0, empIncome - incomeAdjust + busIncome + otherTotal)

  // 社会保険料（給与＝健保/厚年/雇用、事業＝国民年金＋国保）
  // 育休時は標準報酬月額を育休前の月給で判定し、免除月（12−免除月数）を除いて課す。
  const siBreakdown =
    childcare && input.childcareLeave
      ? (input.salaryBreakdown ?? { monthlySalary: input.childcareLeave.preMonthlySalary, annualBonus: 0 })
      : input.salaryBreakdown
  // 社会保険料の実額オーバーライド（実額モード）。presence 判定なので { total: 0 } も「社保0円」として有効。
  // 指定時は料率計算をスキップし、社会保険料控除・手取りの両方にこの額を使う（両モードで有効）。
  const si =
    input.socialInsuranceActual !== undefined
      ? actualSocialInsurance(input.socialInsuranceActual.total)
      : mode === 'employee'
        ? socialInsurance(
            salaryIncome,
            input.age,
            table,
            siBreakdown,
            input.healthInsurance,
            childcare ? 12 - childcare.exemptMonths : 12,
            childcare ? !!input.childcareLeave?.exemptBonus : false,
          )
        : nationalInsurance(totalIncome, input.age, input.kokuhoMembers, table)

  const incomeTaxDeductions = buildDeductions('incomeTax', totalIncome, si.total, input, table)
  const residentTaxDeductions = buildDeductions('residentTax', totalIncome, si.total, input, table)

  const taxableForIncomeTax = floorTo1000(Math.max(0, totalIncome - incomeTaxDeductions.total))
  const taxableForResident = floorTo1000(Math.max(0, totalIncome - residentTaxDeductions.total))

  // 所得税の算出額（住宅ローン控除＝税額控除の適用前）。
  const baseTax = baseIncomeTax(taxableForIncomeTax, table)
  // 住宅ローン控除を「所得税 → 住民税所得割」の順に配分。
  const housingLoanCredit = applyHousingLoanCredit(input, totalIncome, baseTax, taxableForIncomeTax, table)
  const baseTaxAfterCredit = baseTax - housingLoanCredit.appliedToIncomeTax
  const incomeTax = baseTaxAfterCredit <= 0 ? 0 : floorTo100(baseTaxAfterCredit * (1 + table.reconstructionSurtaxRate))

  // 住民税。resident.incomePortion は調整控除後・住宅ローン控除前（ふるさと納税の基礎）。
  // 住民税の級地率（1級地1.0／2級地0.9／3級地0.8）と均等割の上書き（超過課税の自治体）。
  const gradeFactor = input.residentGradeLevel === 2 ? 0.9 : input.residentGradeLevel === 3 ? 0.8 : 1
  const humanDiffSum = humanDeductionDiffSum(totalIncome, input, table)
  const resident = residentTax(
    {
      taxableForResident,
      humanDeductionDiffSum: humanDiffSum,
      totalIncome,
      dependentCount: nonTaxableDependentCount(input, table),
      gradeFactor,
      perCapitaOverride: input.residentPerCapitaOverride,
      personalNonTaxableEligible: isPersonalNonTaxableEligible(input),
    },
    table,
  )
  const residentTaxTotal = Math.max(0, resident.total - housingLoanCredit.appliedToResidentTax)

  const totalBurden = incomeTax + residentTaxTotal + si.total
  // 手取りの基礎: 給与＝額面、事業＝収入−必要経費（青色控除前の現金利益）、＋給与以外の所得
  const grossIncome = (mode === 'employee' ? salaryIncome : busProfit) + otherTotal
  // 育児休業給付金（非課税）は手取りに加算する。
  const takeHome = grossIncome - totalBurden + (childcare?.total ?? 0)

  const medicalDetail = input.medicalExpense ? medicalExpenseDetail(input.medicalExpense, totalIncome, table) : undefined

  return {
    taxYear: table.year,
    mode,
    salaryIncome,
    grossIncome,
    businessIncome: busIncome,
    employmentIncome: empIncome,
    incomeAdjustment: incomeAdjust,
    otherIncomeTotal: otherTotal,
    totalIncome,
    socialInsurance: si,
    incomeTaxDeductions,
    residentTaxDeductions,
    taxableForIncomeTax,
    taxableForResidentTax: taxableForResident,
    humanDeductionDiffSum: humanDiffSum,
    incomeTax,
    residentTax: residentTaxTotal,
    residentTaxDetail: resident,
    housingLoanCredit,
    medicalExpense:
      medicalDetail && medicalDetail.amount > 0
        ? { method: medicalDetail.method, amount: medicalDetail.amount }
        : undefined,
    childcareLeave:
      childcare && childcare.leaveDays > 0
        ? {
            benefit: childcare.benefit,
            postBirthBenefit: childcare.postBirthBenefit,
            total: childcare.total,
            exemptMonths: childcare.exemptMonths,
            leaveDays: childcare.leaveDays,
            periodCount: childcare.periodCount,
          }
        : undefined,
    totalBurden,
    takeHome,
  }
}

/** 住宅ローン控除（税額控除）を所得税→住民税所得割の順に配分する。 */
function applyHousingLoanCredit(
  input: TakeHomeInput,
  totalIncome: number,
  baseTax: number,
  taxableForIncomeTax: number,
  table: TaxTable,
): HousingLoanCreditBreakdown {
  const empty: HousingLoanCreditBreakdown = {
    available: 0,
    appliedToIncomeTax: 0,
    appliedToResidentTax: 0,
    total: 0,
  }
  if (!input.housingLoan || !table.housingLoan) return empty
  const available = housingLoanAvailableCredit(input.housingLoan, totalIncome, table)
  if (available <= 0) return empty

  const appliedToIncomeTax = Math.min(available, Math.max(0, baseTax))
  // 住民税からの控除上限＝「所得税の課税総所得金額等（＝所得控除後の課税所得）×5%」と97,500円の小さい方。
  // 合計所得（totalIncome）ではない点に注意（国税庁 No.1211-1・令和4年以降入居）。
  const carryoverCap = Math.min(
    table.housingLoan.residentCarryover.cap,
    Math.floor(taxableForIncomeTax * table.housingLoan.residentCarryover.rate),
  )
  const appliedToResidentTax = Math.min(available - appliedToIncomeTax, Math.max(0, carryoverCap))
  return {
    available,
    appliedToIncomeTax,
    appliedToResidentTax,
    total: appliedToIncomeTax + appliedToResidentTax,
  }
}
