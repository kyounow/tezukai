/**
 * 年度別 TaxTable のレジストリ。
 *
 * 法改正で新年度を追加する手順:
 *   1. `<年度>.ts` を作成（前年を複製して数値を更新。出典コメント必須）
 *   2. その年度の `TAX_TABLE_<年度>` を本ファイルの TAX_TABLES に登録
 *   3. `TaxYear`（types.ts）のユニオンに年度を追加
 *   4. AVAILABLE_TAX_YEARS に追加し、参照ケース fixture と契約テストを確認
 * 詳細は data/taxTables/README.md / リポジトリ直下の TODO.md を参照。
 */
import type { TaxTable, TaxYear } from './types'
import { TAX_TABLE_2025 } from './2025'
import { TAX_TABLE_2026 } from './2026'

/** 登録済みの年度別ルールセット。 */
export const TAX_TABLES: Readonly<Record<TaxYear, TaxTable>> = {
  2025: TAX_TABLE_2025,
  2026: TAX_TABLE_2026,
}

/** コア API の既定の対象年度（taxYear 省略時のフォールバック）。後方互換のため 2025。 */
export const DEFAULT_TAX_YEAR: TaxYear = 2025

/** 選択可能な年度（新しい順）。先頭が最新＝UI の初期選択に使う。 */
export const AVAILABLE_TAX_YEARS: readonly TaxYear[] = [2026, 2025]

/** 最新の対象年度（UI の初期表示に使用）。 */
export const LATEST_TAX_YEAR: TaxYear = AVAILABLE_TAX_YEARS[0]

/** 年度から TaxTable を取得する。未登録の年度は例外。 */
export function getTaxTable(year: TaxYear = DEFAULT_TAX_YEAR): TaxTable {
  const table = TAX_TABLES[year]
  if (!table) throw new Error(`未対応の税年度: ${year}`)
  return table
}

export type { TaxTable, TaxYear } from './types'
