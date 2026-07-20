import { describe, it, expect } from 'vitest'
import { computeSettlement } from './settlement'

// 精算（還付/追徴の目安）: 算出した年税額（復興税込み・住宅ローン控除後）と源泉徴収税額の差。
// diff = finalTax − withheld（負＝還付見込み・正＝追加納付の目安・0＝過不足なし）。
describe('computeSettlement（還付/追徴の精算）', () => {
  it('源泉徴収税額 > 年税額 なら還付見込み（diff < 0）', () => {
    const r = computeSettlement({ annualTax: 120_000, withheld: 150_000 })
    expect(r.annualTax).toBe(120_000)
    expect(r.furusatoCredit).toBe(0)
    expect(r.finalTax).toBe(120_000)
    expect(r.withheld).toBe(150_000)
    expect(r.diff).toBe(-30_000) // 30,000円の還付見込み
  })

  it('源泉徴収税額 < 年税額 なら追加納付の目安（diff > 0）', () => {
    const r = computeSettlement({ annualTax: 200_000, withheld: 150_000 })
    expect(r.finalTax).toBe(200_000)
    expect(r.diff).toBe(50_000)
  })

  it('過不足なし（diff === 0）', () => {
    const r = computeSettlement({ annualTax: 150_000, withheld: 150_000 })
    expect(r.diff).toBe(0)
  })

  it('ふるさと納税の所得税還付分を合成して finalTax・diff を減らす', () => {
    // 年税額200,000・ふるさと所得税還付8,000・源泉徴収180,000。
    // finalTax = 200,000 − 8,000 = 192,000。diff = 192,000 − 180,000 = 12,000。
    const r = computeSettlement({ annualTax: 200_000, withheld: 180_000, furusatoIncomeTaxCredit: 8_000 })
    expect(r.furusatoCredit).toBe(8_000)
    expect(r.finalTax).toBe(192_000)
    expect(r.diff).toBe(12_000)
  })

  it('ふるさと還付で還付側に転じる（diff が負に）', () => {
    const r = computeSettlement({ annualTax: 200_000, withheld: 195_000, furusatoIncomeTaxCredit: 20_000 })
    expect(r.finalTax).toBe(180_000)
    expect(r.diff).toBe(-15_000)
  })

  it('finalTax は max(0, annualTax − furusatoCredit) で0未満にしない', () => {
    const r = computeSettlement({ annualTax: 5_000, withheld: 0, furusatoIncomeTaxCredit: 8_000 })
    expect(r.finalTax).toBe(0)
    expect(r.diff).toBe(0) // 0 − 0
  })

  it('withheld は0以上にクランプ、負の furusatoIncomeTaxCredit も0にクランプ', () => {
    const r = computeSettlement({ annualTax: 100_000, withheld: -10_000, furusatoIncomeTaxCredit: -5_000 })
    expect(r.withheld).toBe(0)
    expect(r.furusatoCredit).toBe(0)
    expect(r.finalTax).toBe(100_000)
    expect(r.diff).toBe(100_000)
  })

  it('furusatoIncomeTaxCredit 未指定は還付分0扱い', () => {
    const r = computeSettlement({ annualTax: 100_000, withheld: 90_000 })
    expect(r.furusatoCredit).toBe(0)
    expect(r.finalTax).toBe(100_000)
    expect(r.diff).toBe(10_000)
  })

  it('負の annualTax は0にクランプ', () => {
    const r = computeSettlement({ annualTax: -100, withheld: 0 })
    expect(r.annualTax).toBe(0)
    expect(r.finalTax).toBe(0)
    expect(r.diff).toBe(0)
  })
})
