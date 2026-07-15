import { describe, it, expect } from 'vitest'
import { residentTax, adjustmentCredit } from './residentTax'

describe('調整控除', () => {
  it('課税所得200万円以下: min(人的控除差, 課税所得)×5%', () => {
    expect(adjustmentCredit(1_500_000, 50_000, 5_000_000)).toBe(2_500)
  })

  it('課税所得200万円超: {人的控除差−(課税所得−200万)}×5%（最低2,500円）', () => {
    // remainder = max(50,000 − 1,000,000, 50,000) = 50,000 → 2,500
    expect(adjustmentCredit(3_000_000, 50_000, 5_000_000)).toBe(2_500)
  })

  it('合計所得2,500万円超は調整控除なし', () => {
    expect(adjustmentCredit(30_000_000, 50_000, 26_000_000)).toBe(0)
  })
})

describe('個人住民税', () => {
  it('課税標準300万・人的控除差5万（単身）', () => {
    const r = residentTax({
      taxableForResident: 3_000_000,
      humanDeductionDiffSum: 50_000,
      totalIncome: 5_000_000,
      dependentCount: 0,
    })
    // 調整控除2,500。市:floor100(180,000−1,500)=178,500 / 県:floor100(120,000−1,000)=119,000
    expect(r.incomePortion).toBe(297_500)
    expect(r.perCapita).toBe(4_000)
    expect(r.forestTax).toBe(1_000)
    expect(r.adjustmentCredit).toBe(2_500)
    expect(r.total).toBe(302_500)
    // 課税なので非課税フラグは両方 false
    expect(r.perCapitaExempt).toBe(false)
    expect(r.incomePortionExempt).toBe(false)
  })

  it('低所得の単身は非課税（均等割・所得割とも0）', () => {
    const r = residentTax({
      taxableForResident: 0,
      humanDeductionDiffSum: 50_000,
      totalIncome: 400_000, // ≤ 35万+10万=45万
      dependentCount: 0,
    })
    expect(r.total).toBe(0)
    expect(r.perCapitaExempt).toBe(true)
    expect(r.incomePortionExempt).toBe(true)
  })

  it('単身1級地の非課税限度額の境界（合計所得45万＝均等割・所得割の限度）', () => {
    // 単身は 35万×1+10万=45万 が均等割・所得割ともに限度（加算なし）。
    const atLimit = residentTax({
      taxableForResident: 0,
      humanDeductionDiffSum: 50_000,
      totalIncome: 450_000, // ちょうど限度以下→非課税
      dependentCount: 0,
    })
    expect(atLimit.perCapitaExempt).toBe(true)
    expect(atLimit.incomePortionExempt).toBe(true)

    const overLimit = residentTax({
      taxableForResident: 100_000,
      humanDeductionDiffSum: 50_000,
      totalIncome: 460_000, // 限度超→課税
      dependentCount: 0,
    })
    expect(overLimit.perCapitaExempt).toBe(false)
    expect(overLimit.incomePortionExempt).toBe(false)
  })

  it('扶養ありで所得割は非課税だが均等割は課税されるケース', () => {
    const r = residentTax({
      taxableForResident: 0,
      humanDeductionDiffSum: 100_000,
      totalIncome: 1_050_000, // 均等割限度101万超・所得割限度112万以下（人数2）
      dependentCount: 1,
    })
    expect(r.incomePortion).toBe(0)
    expect(r.perCapita).toBe(4_000)
    expect(r.forestTax).toBe(1_000)
    expect(r.total).toBe(5_000)
    // 均等割のみ課税＝所得割は非課税・均等割は課税
    expect(r.perCapitaExempt).toBe(false)
    expect(r.incomePortionExempt).toBe(true)
  })
})

describe('地方税法295条の非課税（障害者・未成年者・寡婦・ひとり親の135万円判定）', () => {
  // 障害者・未成年者・寡婦・ひとり親で前年の合計所得金額が135万円以下なら住民税は非課税。
  // 給与収入で約204.4万円（令和7の給与所得控除で 2,042,857円が合計所得135万に相当）。
  // 出典: 地方税法295条第1項第2号、東京都主税局。
  it('該当者は合計所得135万円ちょうどで非課税（通常の限度額を超えていても非課税）', () => {
    const r = residentTax({
      taxableForResident: 900_000,
      humanDeductionDiffSum: 50_000,
      totalIncome: 1_350_000, // 扶養1人でも通常限度（所得割112万）超だが、135万判定で非課税
      dependentCount: 1,
      personalNonTaxableEligible: true,
    })
    expect(r.perCapitaExempt).toBe(true)
    expect(r.incomePortionExempt).toBe(true)
    expect(r.total).toBe(0)
  })

  it('合計所得135万円超は課税（135万は上限判定）', () => {
    const r = residentTax({
      taxableForResident: 900_000,
      humanDeductionDiffSum: 50_000,
      totalIncome: 1_350_001,
      dependentCount: 1,
      personalNonTaxableEligible: true,
    })
    expect(r.perCapitaExempt).toBe(false)
    expect(r.incomePortionExempt).toBe(false)
  })

  it('該当属性がなければ135万円でも課税（通常の非課税限度額のみで判定）', () => {
    const r = residentTax({
      taxableForResident: 900_000,
      humanDeductionDiffSum: 50_000,
      totalIncome: 1_350_000,
      dependentCount: 1,
      personalNonTaxableEligible: false,
    })
    expect(r.perCapitaExempt).toBe(false)
    expect(r.incomePortionExempt).toBe(false)
  })
})
