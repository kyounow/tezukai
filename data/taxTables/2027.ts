/**
 * 令和9年（2027）税率・控除データ。**暫定（工事中）**。
 *
 * 所得税の控除構造（基礎控除104/67/62万・給与所得控除74万・配偶者/扶養の所得要件62万）は
 * 令和8年度改正で「令和8・令和9年分」に適用されるため、令和8（2026）の定数をそのまま継承する。
 *
 * 令和9年分のみの改正:
 *   - 防衛特別所得税1%を新設、復興特別所得税を2.1%→1.1%へ。**合算2.1%で負担は不変**のため
 *     reconstructionSurtaxRate は 0.021 のまま（内訳: 復興1.1%＋防衛1.0%）。計算は変えず注記のみ。
 *
 * 確定/未確定（社会保険料）:
 *   - 国民年金: 令和9年度 月額18,290円＝年215,040円→**219,480円**（確定）。出典: 日本年金機構。
 *   - 協会けんぽ料率・雇用保険料率・子ども子育て支援金率・国民健康保険・厚年標準報酬上限の引上げ（68万・令和9年9月〜）は
 *     **令和9未告示のため令和8を流用**（年度末の告示後に差し替え）。`provisional: true` でUIに暫定表示。
 * 詳細は data/taxTables/sources-2027.md を参照。
 */
import type { NationalPensionConfig, TaxTable } from './types'
import { TAX_TABLE_2026 } from './2026'

export const TAX_YEAR_2027 = 2027 as const

// 国民年金（令和9年度・定額）。月額18,290円×12。出典: 日本年金機構（確定）。
const NATIONAL_PENSION_2027: NationalPensionConfig = { annual: 219_480 }

export const TAX_TABLE_2027: TaxTable = {
  // 令和8（令和8改正反映済み）を継承し、令和9で確定している差分だけ上書き。
  ...TAX_TABLE_2026,
  year: TAX_YEAR_2027,
  nationalPension: NATIONAL_PENSION_2027,
  provisional: true,
}
