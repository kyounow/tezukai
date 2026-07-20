/**
 * 精算（還付/追徴の目安）の純粋関数。
 *
 * 実額（源泉徴収票）モードで、確定申告した場合の所得税の年税額（試算）と源泉徴収税額の差から
 * 還付/追徴の目安を出す。所得税は申告ベースの試算、住民税は自治体決定額と端数処理等で差が出る
 * 計算値のため、「確定」ではなく「見込み・目安」として扱う。
 *
 * calculateTakeHome には入れない（手取り計算とは独立した後段の精算ロジック）。
 */

export interface SettlementInput {
  /** 算出した所得税の年税額（TakeHomeResult.incomeTax。復興特別所得税込み・住宅ローン控除後）。 */
  annualTax: number
  /** 源泉徴収税額（源泉徴収票の『源泉徴収税額』欄。0以上）。 */
  withheld: number
  /** 確定申告方式のふるさと納税の所得税還付分（任意。ワンストップ特例では渡さない）。 */
  furusatoIncomeTaxCredit?: number
}

export interface SettlementResult {
  /** 入力の年税額（0以上にクランプ）。 */
  annualTax: number
  /** 合成したふるさと納税の還付分（未指定は0）。 */
  furusatoCredit: number
  /** 精算対象の税額 ＝ max(0, annualTax − furusatoCredit)。 */
  finalTax: number
  /** 源泉徴収税額（0以上にクランプ）。 */
  withheld: number
  /** finalTax − withheld（負＝還付見込み・正＝追加納付の目安・0＝過不足なし）。 */
  diff: number
}

/**
 * 年税額・源泉徴収税額・（任意で）ふるさと納税の所得税還付分から還付/追徴の目安を求める。
 * すべて0以上・整数にクランプし、finalTax は0未満にしない。
 */
export function computeSettlement(input: SettlementInput): SettlementResult {
  const annualTax = Math.max(0, Math.floor(input.annualTax))
  const withheld = Math.max(0, Math.floor(input.withheld))
  const furusatoCredit = Math.max(0, Math.floor(input.furusatoIncomeTaxCredit ?? 0))
  const finalTax = Math.max(0, annualTax - furusatoCredit)
  const diff = finalTax - withheld
  return { annualTax, furusatoCredit, finalTax, withheld, diff }
}
