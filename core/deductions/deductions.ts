import {
  BASIC_DEDUCTION_INCOME_TAX_2025,
  BASIC_DEDUCTION_RESIDENT_TAX_2025,
  DEPENDENT_DEDUCTION_2025,
  SPECIAL_RELATIVE_DEDUCTION_2025,
  SPOUSE_DEDUCTION_2025,
  SPOUSE_DEDUCTION_INCOME_LIMIT,
  SPOUSE_OWNER_INCOME_TIERS,
  SPOUSE_SPECIAL_DEDUCTION_2025,
  SPOUSE_SPECIAL_DEDUCTION_INCOME_LIMIT,
  type AmountByIncomeBand,
} from '@data/taxTables/2025'
import { employmentIncome } from '../income/employmentIncome'
import type { DependentsInput } from '../types'

/** 所得税用 / 住民税用の区分。控除額テーブルがこのキーで分かれている。 */
export type TaxKind = 'incomeTax' | 'residentTax'

function pickByBand(bands: readonly AmountByIncomeBand[], income: number): number {
  const band = bands.find((b) => b.upTo === null || income <= b.upTo)
  return band ? band.amount : 0
}

/** 基礎控除（合計所得金額に応じる）。出典: 国税庁 No.1199（所得税・令和7改正）／自治体（住民税）。 */
export function basicDeduction(totalIncome: number, kind: TaxKind): number {
  const bands = kind === 'incomeTax' ? BASIC_DEDUCTION_INCOME_TAX_2025 : BASIC_DEDUCTION_RESIDENT_TAX_2025
  return pickByBand(bands, Math.max(0, totalIncome))
}

/** 本人の合計所得金額から配偶者(特別)控除のティア index（0:≤900万 / 1:≤950万 / 2:≤1000万 / -1:1000万超）。 */
function ownerTierIndex(ownerTotalIncome: number): number {
  return SPOUSE_OWNER_INCOME_TIERS.findIndex((tier) => ownerTotalIncome <= tier)
}

/**
 * 配偶者控除＋配偶者特別控除。配偶者の合計所得（給与収入から算出）で自動判定する。
 * 出典: 国税庁 No.1191 / No.1195。
 */
export function spouseDeduction(
  ownerTotalIncome: number,
  spouseSalaryIncome: number,
  elderly: boolean,
  kind: TaxKind,
): number {
  const tier = ownerTierIndex(ownerTotalIncome)
  if (tier < 0) return 0 // 本人の合計所得1000万円超は適用なし

  const spouseIncome = employmentIncome(spouseSalaryIncome)
  if (spouseIncome <= SPOUSE_DEDUCTION_INCOME_LIMIT) {
    const table = SPOUSE_DEDUCTION_2025[kind]
    return (elderly ? table.elderly : table.general)[tier]
  }
  if (spouseIncome <= SPOUSE_SPECIAL_DEDUCTION_INCOME_LIMIT) {
    const band = SPOUSE_SPECIAL_DEDUCTION_2025[kind].find((b) => spouseIncome <= b.upTo)
    return band ? band.amounts[tier] : 0
  }
  return 0 // 配偶者の合計所得133万円超は適用なし
}

/** 扶養控除（区分別人数の合計）。出典: 国税庁 No.1180／自治体（住民税）。 */
export function dependentDeduction(d: DependentsInput, kind: TaxKind): number {
  const t = DEPENDENT_DEDUCTION_2025[kind]
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
 * 出典: 国税庁 No.1177／町田市（住民税）。
 */
export function specialRelativeDeduction(incomes: readonly number[], kind: TaxKind): number {
  const bands = SPECIAL_RELATIVE_DEDUCTION_2025[kind]
  let sum = 0
  for (const income of incomes) {
    if (income <= SPOUSE_DEDUCTION_INCOME_LIMIT) continue // 58万以下は扶養控除（特定扶養）側
    sum += pickByBand(bands, income)
  }
  return sum
}
