import type { BlueDeduction, BusinessInput } from '../types'

/**
 * 事業所得 ＝ 総収入金額 − 必要経費 − 青色申告特別控除。
 * 青色申告特別控除は黒字を上限に差し引く（赤字を作らない）。損失（赤字）はそのまま返す。
 * 出典: 国税庁 No.1350（事業所得）、No.2072（青色申告特別控除）。
 *   65万＝複式簿記＋e-Tax申告 or 電子帳簿保存、55万＝複式簿記、10万＝簡易簿記等、白色＝0。
 */
const BLUE_DEDUCTION_AMOUNT: Record<BlueDeduction, number> = {
  none: 0,
  '10': 100_000,
  '55': 550_000,
  '65': 650_000,
}

/** 事業の利益（青色申告特別控除前）＝総収入−必要経費。 */
export function businessProfit(input: BusinessInput): number {
  return Math.floor(input.revenue) - Math.floor(input.expenses)
}

/** 事業所得（青色申告特別控除後）。 */
export function businessIncome(input: BusinessInput): number {
  const profit = businessProfit(input)
  const blue = BLUE_DEDUCTION_AMOUNT[input.blueDeduction ?? 'none']
  const applied = Math.min(Math.max(0, profit), blue)
  return profit - applied
}
