/**
 * 税額計算で多用する端数処理ユーティリティ（純粋関数）。
 *
 * 税制では区分ごとに丸め方が定められている（例: 課税所得は1000円未満切捨て、
 * 算出税額は100円未満切捨て）。丸め規則そのものは各計算側が `unit` を指定し、
 * ここでは「指定単位での切捨て/切上げ」という汎用操作だけを提供する。
 *
 * 注意: 円未満の端数を扱う社会保険料の50銭丸め等は別途専用関数を用意する
 * （本ファイルは円単位以上の切り下げ/上げを対象）。
 */

/** value を unit の倍数に切り捨てる（例: floorTo(1_234_567, 1000) === 1_234_000）。 */
export function floorTo(value: number, unit: number): number {
  if (unit <= 0) throw new RangeError(`unit は正の数で指定してください: ${unit}`)
  return Math.floor(value / unit) * unit
}

/** value を unit の倍数に切り上げる。 */
export function ceilTo(value: number, unit: number): number {
  if (unit <= 0) throw new RangeError(`unit は正の数で指定してください: ${unit}`)
  return Math.ceil(value / unit) * unit
}

/** 課税標準額: 1000円未満切捨て（所得税の課税所得・住民税の課税標準で使用）。 */
export function floorTo1000(value: number): number {
  return floorTo(value, 1000)
}

/** 算出税額: 100円未満切捨て（確定申告の所得税額・住民税所得割額で使用）。 */
export function floorTo100(value: number): number {
  return floorTo(value, 100)
}
