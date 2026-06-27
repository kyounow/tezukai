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
  })

  it('低所得の単身は非課税（均等割・所得割とも0）', () => {
    const r = residentTax({
      taxableForResident: 0,
      humanDeductionDiffSum: 50_000,
      totalIncome: 400_000, // ≤ 35万+10万=45万
      dependentCount: 0,
    })
    expect(r.total).toBe(0)
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
  })
})
