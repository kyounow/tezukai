import { DEFAULT_TAX_YEAR, getTaxTable } from '@data/taxTables/index'
import type { TaxTable } from '@data/taxTables/types'
import { employmentIncome } from './income/employmentIncome'
import { socialInsurance } from './insurance/socialInsurance'
import {
  basicDeduction,
  dependentDeduction,
  specialRelativeDeduction,
  spouseDeduction,
  type TaxKind,
} from './deductions/deductions'
import { incomeTaxWithSurtax } from './tax/incomeTax'
import { residentTax } from './tax/residentTax'
import { floorTo1000 } from './util/rounding'
import type { DeductionsBreakdown, TakeHomeInput, TakeHomeResult } from './types'

/** 特定親族特別控除の上位帯（合計所得95万以下）の人的控除差は特定扶養と同じ18万で近似。 */
const SPECIAL_RELATIVE_DIFF_INCOME_LIMIT = 950_000

function buildDeductions(
  kind: TaxKind,
  totalIncome: number,
  socialInsuranceTotal: number,
  input: TakeHomeInput,
  table: TaxTable,
): DeductionsBreakdown {
  const basic = basicDeduction(totalIncome, kind, table)
  const spouse = input.spouse
    ? spouseDeduction(totalIncome, input.spouse.salaryIncome, input.spouse.elderly ?? false, kind, table)
    : 0
  const dependents = input.dependents ? dependentDeduction(input.dependents, kind, table) : 0
  const specialRelative = input.dependents?.specialRelativeIncomes
    ? specialRelativeDeduction(input.dependents.specialRelativeIncomes, kind, table)
    : 0
  const total = basic + socialInsuranceTotal + spouse + dependents + specialRelative
  return { basic, socialInsurance: socialInsuranceTotal, spouse, dependents, specialRelative, total }
}

/** 調整控除に用いる人的控除額の差の合計（主要控除のみ・近似。sources-2025.md 参照）。 */
function humanDeductionDiffSum(totalIncome: number, input: TakeHomeInput, table: TaxTable): number {
  const D = table.humanDeductionDiff
  let sum = 0
  if (totalIncome <= 24_000_000) sum += D.basic

  if (input.spouse && totalIncome <= 10_000_000) {
    const spouseIncome = employmentIncome(input.spouse.salaryIncome, table)
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
  return sum
}

/** 住民税の非課税限度額判定に使う「本人を除く人数」（合計所得58万円以下の同一生計配偶者＋扶養親族）。 */
function nonTaxableDependentCount(input: TakeHomeInput, table: TaxTable): number {
  let count = 0
  if (input.spouse && employmentIncome(input.spouse.salaryIncome, table) <= table.spouseDeductionIncomeLimit) {
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
  const salaryIncome = Math.max(0, Math.floor(input.salaryIncome))
  const empIncome = employmentIncome(salaryIncome, table)
  const totalIncome = empIncome // 給与のみ前提なので合計所得＝給与所得
  const si = socialInsurance(salaryIncome, input.age, table)

  const incomeTaxDeductions = buildDeductions('incomeTax', totalIncome, si.total, input, table)
  const residentTaxDeductions = buildDeductions('residentTax', totalIncome, si.total, input, table)

  const taxableForIncomeTax = floorTo1000(Math.max(0, totalIncome - incomeTaxDeductions.total))
  const taxableForResident = floorTo1000(Math.max(0, totalIncome - residentTaxDeductions.total))

  const incomeTax = incomeTaxWithSurtax(taxableForIncomeTax, table)
  const resident = residentTax(
    {
      taxableForResident,
      humanDeductionDiffSum: humanDeductionDiffSum(totalIncome, input, table),
      totalIncome,
      dependentCount: nonTaxableDependentCount(input, table),
    },
    table,
  )

  const totalBurden = incomeTax + resident.total + si.total
  const takeHome = salaryIncome - totalBurden

  return {
    taxYear: table.year,
    salaryIncome,
    employmentIncome: empIncome,
    totalIncome,
    socialInsurance: si,
    incomeTaxDeductions,
    residentTaxDeductions,
    taxableForIncomeTax,
    taxableForResidentTax: taxableForResident,
    incomeTax,
    residentTax: resident.total,
    residentTaxDetail: resident,
    totalBurden,
    takeHome,
  }
}
