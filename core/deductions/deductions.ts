import { getTaxTable } from '@data/taxTables/index'
import type { AmountByIncomeBand } from '@data/taxTables/2025'
import type { TaxTable } from '@data/taxTables/types'
import { employmentIncome } from '../income/employmentIncome'
import type { DependentsInput, FamilyDisabilityInput, PersonalInput, SpouseInput } from '../types'

/** 所得税用 / 住民税用の区分。控除額テーブルがこのキーで分かれている。 */
export type TaxKind = 'incomeTax' | 'residentTax'

function pickByBand(bands: readonly AmountByIncomeBand[], income: number): number {
  const band = bands.find((b) => b.upTo === null || income <= b.upTo)
  return band ? band.amount : 0
}

/** 基礎控除（合計所得金額に応じる）。出典: 国税庁 No.1199（所得税・令和7改正）／自治体（住民税）。 */
export function basicDeduction(totalIncome: number, kind: TaxKind, table: TaxTable = getTaxTable()): number {
  return pickByBand(table.basicDeduction[kind], Math.max(0, totalIncome))
}

/** 本人の合計所得金額から配偶者(特別)控除のティア index（0:≤900万 / 1:≤950万 / 2:≤1000万 / -1:1000万超）。 */
function ownerTierIndex(ownerTotalIncome: number, table: TaxTable): number {
  return table.ownerIncomeTiers.findIndex((tier) => ownerTotalIncome <= tier)
}

/**
 * 公的年金等に係る雑所得（円）= max(0, 収入金額 × rate − 控除額)。65歳到達で控除が拡大する。
 * 出典: 国税庁 No.1600（公的年金等以外の合計所得1,000万円以下の速算表）。
 */
function publicPensionMiscIncome(revenue: number, over65: boolean, table: TaxTable): number {
  const income = Math.max(0, Math.floor(revenue))
  const bands = over65 ? table.publicPensionDeduction.from65 : table.publicPensionDeduction.under65
  const band = bands.find((b) => b.upTo === null || income <= b.upTo)
  if (!band) return income
  return Math.max(0, Math.floor(income * band.rate - band.deduction))
}

/**
 * 配偶者の合計所得金額（円）。給与なら給与所得控除後、公的年金なら公的年金等控除後の雑所得で算出する。
 * 配偶者(特別)控除・調整控除の人的控除差・住民税の非課税人数判定で共通に使い、食い違いを防ぐ。
 */
export function spouseTotalIncome(spouse: SpouseInput, table: TaxTable = getTaxTable()): number {
  if (spouse.incomeType === 'pension') {
    return publicPensionMiscIncome(spouse.salaryIncome, spouse.pensionOver65 ?? false, table)
  }
  return employmentIncome(spouse.salaryIncome, table)
}

/**
 * 配偶者控除＋配偶者特別控除。配偶者の合計所得（収入から算出）で自動判定する。
 * 出典: 国税庁 No.1191 / No.1195。
 */
export function spouseDeduction(
  ownerTotalIncome: number,
  spouse: SpouseInput,
  kind: TaxKind,
  table: TaxTable = getTaxTable(),
): number {
  const tier = ownerTierIndex(ownerTotalIncome, table)
  if (tier < 0) return 0 // 本人の合計所得1000万円超は適用なし

  const spouseIncome = spouseTotalIncome(spouse, table)
  if (spouseIncome <= table.spouseDeductionIncomeLimit) {
    const t = table.spouseDeduction[kind]
    return (spouse.elderly ? t.elderly : t.general)[tier]
  }
  if (spouseIncome <= table.spouseSpecialDeductionIncomeLimit) {
    const band = table.spouseSpecialDeduction[kind].find((b) => spouseIncome <= b.upTo)
    return band ? band.amounts[tier] : 0
  }
  return 0 // 配偶者の合計所得133万円超は適用なし
}

/** 扶養控除（区分別人数の合計）。出典: 国税庁 No.1180／自治体（住民税）。 */
export function dependentDeduction(d: DependentsInput, kind: TaxKind, table: TaxTable = getTaxTable()): number {
  const t = table.dependentDeduction[kind]
  return (
    (d.general ?? 0) * t.general +
    (d.specified ?? 0) * t.specified +
    (d.elderlyCoLiving ?? 0) * t.elderlyCoLiving +
    (d.elderlyOther ?? 0) * t.elderlyOther
  )
}

/**
 * 特定親族特別控除（令和7年新設、19〜22歳・合計所得58万超123万以下）。
 * 各対象者の合計所得金額から区分の控除額を合算する。58万円以下は扶養控除側のため対象外。
 * その年度に制度が無い（table.specialRelativeDeduction 未設定）場合は 0。
 * 出典: 国税庁 No.1177／町田市（住民税）。
 */
export function specialRelativeDeduction(
  incomes: readonly number[],
  kind: TaxKind,
  table: TaxTable = getTaxTable(),
): number {
  const config = table.specialRelativeDeduction
  if (!config) return 0
  const bands = config[kind]
  let sum = 0
  for (const income of incomes) {
    if (income <= table.spouseDeductionIncomeLimit) continue // 58万以下は扶養控除（特定扶養）側
    sum += pickByBand(bands, income)
  }
  return sum
}

/**
 * 本人の属性による所得控除（障害者・ひとり親・寡婦・勤労学生）を合算する。
 * ひとり親・寡婦は合計所得500万円以下、勤労学生は合計所得75万円以下が要件（要件外は0）。
 * ひとり親と寡婦は重複適用しない（ひとり親を優先）。障害者控除は所得要件なし。
 * 出典: 国税庁 No.1160（障害者）/No.1170（寡婦）/No.1171（ひとり親）/No.1175（勤労学生）。
 */
export function personalDeduction(
  personal: PersonalInput,
  totalIncome: number,
  kind: TaxKind,
  table: TaxTable = getTaxTable(),
): number {
  const c = table.personalDeduction
  let sum = 0
  // 障害者控除（所得要件なし）。
  if (personal.disability === 'special') sum += c.disabilitySpecial[kind]
  else if (personal.disability === 'normal') sum += c.disabilityNormal[kind]
  // ひとり親・寡婦（合計所得500万円以下。両方該当時はひとり親を優先し重複適用しない）。
  if (personal.singleParent) {
    if (totalIncome <= c.singleParentWidowIncomeLimit) sum += c.singleParent[kind]
  } else if (personal.widow) {
    if (totalIncome <= c.singleParentWidowIncomeLimit) sum += c.widow[kind]
  }
  // 勤労学生（合計所得75万円以下）。
  if (personal.workingStudent && totalIncome <= c.workingStudentIncomeLimit) {
    sum += c.workingStudent[kind]
  }
  return sum
}

/**
 * 同一生計配偶者・扶養親族の障害者控除（人数×区分別控除額の合計）。所得要件はない。
 * 普通27万/26万・特別（同居以外）40万/30万・同居特別75万/53万（所得税/住民税）。
 * 出典: 国税庁 No.1160（障害者控除）。
 */
export function familyDisabilityDeduction(
  family: FamilyDisabilityInput,
  kind: TaxKind,
  table: TaxTable = getTaxTable(),
): number {
  const c = table.personalDeduction
  return (
    (family.normal ?? 0) * c.disabilityNormal[kind] +
    (family.special ?? 0) * c.disabilitySpecial[kind] +
    (family.coLivingSpecial ?? 0) * c.disabilityCoLivingSpecial[kind]
  )
}
