import { getTaxTable } from '@data/taxTables/index'
import type { AmountByIncomeBand } from '@data/taxTables/2025'
import type { TaxTable } from '@data/taxTables/types'
import { employmentIncome } from '../income/employmentIncome'
import type { DependentsInput } from '../types'

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
 * 配偶者控除＋配偶者特別控除。配偶者の合計所得（給与収入から算出）で自動判定する。
 * 出典: 国税庁 No.1191 / No.1195。
 */
export function spouseDeduction(
  ownerTotalIncome: number,
  spouseSalaryIncome: number,
  elderly: boolean,
  kind: TaxKind,
  table: TaxTable = getTaxTable(),
): number {
  const tier = ownerTierIndex(ownerTotalIncome, table)
  if (tier < 0) return 0 // 本人の合計所得1000万円超は適用なし

  const spouseIncome = employmentIncome(spouseSalaryIncome, table)
  if (spouseIncome <= table.spouseDeductionIncomeLimit) {
    const t = table.spouseDeduction[kind]
    return (elderly ? t.elderly : t.general)[tier]
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
