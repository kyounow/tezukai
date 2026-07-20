import { getTaxTable } from '@data/taxTables/index'
import type { TaxTable } from '@data/taxTables/types'

/**
 * 給与所得の計算方式。
 * - `'formula'`（既定）: 速算式で1円単位に直接計算する（従来動作）。
 * - `'table'`: 給与収入660万円未満を別表第五（電算機特例）で計算する。収入を4,000円区分に
 *   丸めてから速算式を適用し、源泉徴収票・確定申告の「給与所得控除後の給与等の金額」と一致させる。
 */
export type EmploymentIncomeMethod = 'formula' | 'table'

/**
 * 別表第五（電算機特例）の適用上限（給与収入・円）。この額**未満**は4,000円区分に丸めて計算する。
 * 660万円は法構造上の閾値（所得税法28条4項・別表第五＝第二十八条関係）なのでコード定数とする。
 * 出典: 国税庁 令和7年分 確定申告の手引き「手順2」/ 別表第五。
 */
const TABLE_METHOD_MAX_INCOME = 6_600_000

/**
 * 給与所得控除額（円）。給与収入の区分ごとの速算式で算出する。
 * 控除額は給与収入を超えない（低収入で給与所得が負にならないようにする）。
 *
 * 注: 収入660万円未満は本来 別表第五（4,000円刻み）だが、この関数は速算式で近似する
 * （別表第五準拠が必要なときは employmentIncome(..., 'table') を使う）。
 * 出典: 国税庁 No.1410（令和7年分・最低保障65万円）。
 */
export function employmentIncomeDeduction(salaryIncome: number, table: TaxTable = getTaxTable()): number {
  if (salaryIncome <= 0) return 0
  const bracket = table.employmentIncomeDeduction.find((b) => b.upTo === null || salaryIncome <= b.upTo)
  if (!bracket) throw new Error(`給与所得控除の区分が見つかりません: ${salaryIncome}`)
  const deduction = Math.floor(salaryIncome * bracket.rate + bracket.plus)
  return Math.min(salaryIncome, deduction)
}

/**
 * 給与所得（円）＝給与収入−給与所得控除（0 未満にはしない）。
 *
 * method='table' は給与収入660万円未満を別表第五（電算機特例）で計算する:
 * 収入を4,000円区分の下限（＝収入÷4→千円未満切捨て→×4）に丸めてから速算式を適用する。
 * ただし最低保障（定額控除・料率0）帯は控除額が一定のため丸めず収入から直接控除する
 * （確定申告 手順2「650,999円以下→給与所得0円」と一致。定額帯で丸めると過小評価になる）。
 * 660万円以上は formula と同じ直接計算（1円未満切捨て）。
 * 出典: 国税庁 令和7年分 確定申告の手引き「手順2 収入金額等、所得金額を計算する」
 *   （3,600,000〜6,599,999: A×3.2−440,000／1,900,000〜3,599,999: A×2.8−80,000, A＝収入÷4千円未満切捨て）。
 */
export function employmentIncome(
  salaryIncome: number,
  table: TaxTable = getTaxTable(),
  method: EmploymentIncomeMethod = 'formula',
): number {
  if (method === 'table' && salaryIncome > 0 && salaryIncome < TABLE_METHOD_MAX_INCOME) {
    // 収入÷4→千円未満切捨て→×4 ＝ 4,000円区分の下限。
    const rounded = Math.floor(salaryIncome / 4_000) * 4_000
    const bracket = table.employmentIncomeDeduction.find((b) => b.upTo === null || rounded <= b.upTo)
    if (!bracket) throw new Error(`給与所得控除の区分が見つかりません: ${rounded}`)
    // 定額控除（rate 0）帯は区分丸めをせず収入から直接控除する。
    const base = bracket.rate === 0 ? salaryIncome : rounded
    const deduction = Math.min(base, Math.floor(base * bracket.rate + bracket.plus))
    return Math.max(0, base - deduction)
  }
  return Math.max(0, salaryIncome - employmentIncomeDeduction(salaryIncome, table))
}
