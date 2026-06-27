/** 表示用の整形ヘルパー。 */

/** 円表記（例: 3,905,548 円）。 */
export function yen(value: number): string {
  return `${Math.round(value).toLocaleString('ja-JP')} 円`
}

/** 万円表記（例: 390.6 万円）。 */
export function man(value: number): string {
  return `${(value / 10_000).toLocaleString('ja-JP', { maximumFractionDigits: 1 })} 万円`
}

/** 月額換算（年額÷12, 円）。 */
export function perMonth(annual: number): string {
  return yen(Math.round(annual / 12))
}

/** 割合（小数→%表記）。 */
export function percent(ratio: number): string {
  return `${(ratio * 100).toLocaleString('ja-JP', { maximumFractionDigits: 1 })}%`
}
