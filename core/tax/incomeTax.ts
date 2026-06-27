import { getTaxTable } from '@data/taxTables/index'
import type { TaxTable } from '@data/taxTables/types'
import { floorTo1000, floorTo100 } from '../util/rounding'

/**
 * 基準所得税額（円・円未満切捨て）。
 * 課税所得を1,000円未満切捨てしてから速算表（税額＝課税所得×税率−控除額）を適用する。
 * 出典: 国税庁 No.2260。
 */
export function baseIncomeTax(taxableIncome: number, table: TaxTable = getTaxTable()): number {
  const taxable = floorTo1000(Math.max(0, taxableIncome))
  if (taxable <= 0) return 0
  const bracket = table.incomeTaxBrackets.find((b) => b.upTo === null || taxable <= b.upTo)
  if (!bracket) throw new Error(`所得税の区分が見つかりません: ${taxable}`)
  return Math.floor(taxable * bracket.rate - bracket.deduction)
}

/**
 * 復興特別所得税（基準所得税額×2.1%）込みの所得税額（100円未満切捨て）。
 * 出典: 国税庁 復興特別所得税のあらまし、国税庁 No.2260。
 */
export function incomeTaxWithSurtax(taxableIncome: number, table: TaxTable = getTaxTable()): number {
  const base = baseIncomeTax(taxableIncome, table)
  if (base <= 0) return 0
  return floorTo100(base + base * table.reconstructionSurtaxRate)
}
