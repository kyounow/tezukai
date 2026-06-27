/**
 * 給与以外の所得（総合課税）と損益通算。
 *
 * 損益通算で他の所得と相殺できる損失は「不動産・事業・山林・譲渡」の所得に限られ、
 * 雑・一時・配当等の損失は通算できない（0として扱う）。
 * 一時所得・総合長期譲渡所得は、総所得に算入する際に1/2にする。
 *
 * 対象は総合課税のみ。**分離課税（上場株式等・土地建物の譲渡、申告分離課税の配当・利子など）は対象外**。
 * 山林所得・損益通算の厳密な順序・純損失の繰越は当面未対応（概算）。
 * 出典: 国税庁 No.2250（損益通算）, No.1490（一時所得）, No.3161（総合課税の譲渡所得）。
 */
import type { OtherIncomeInput } from '../types'

/**
 * 給与以外の所得金額（損益通算後・総所得への算入額）を返す。
 * 不動産・事業の損失はマイナスのまま返し、給与所得との通算は呼び出し側（takeHome）で行う。
 */
export function otherIncomeTotal(input: OtherIncomeInput): number {
  const business = input.business ?? 0 // 損益通算可（±）
  const realEstate = input.realEstate ?? 0 // 損益通算可（±）
  const miscellaneous = Math.max(0, input.miscellaneous ?? 0) // 雑損失は通算不可
  const dividend = Math.max(0, input.dividend ?? 0)
  const temporary = Math.max(0, input.temporary ?? 0) / 2 // 一時所得は1/2
  const shortTermCapital = Math.max(0, input.generalShortTermCapital ?? 0)
  const longTermCapital = Math.max(0, input.generalLongTermCapital ?? 0) / 2 // 総合長期譲渡は1/2
  return business + realEstate + miscellaneous + dividend + temporary + shortTermCapital + longTermCapital
}
