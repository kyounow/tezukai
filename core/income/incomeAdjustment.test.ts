import { describe, it, expect } from 'vitest'
import { incomeAdjustmentDeduction } from './incomeAdjustment'

describe('所得金額調整控除（850万円超）', () => {
  it('給与収入850万円以下は0', () => {
    expect(incomeAdjustmentDeduction(8_500_000, { hasYoungDependent: true })).toBe(0)
  })
  it('条件非該当は0', () => {
    expect(incomeAdjustmentDeduction(10_000_000, {})).toBe(0)
  })
  it('900万円・23歳未満扶養あり →（900万−850万）×10%＝5万円', () => {
    expect(incomeAdjustmentDeduction(9_000_000, { hasYoungDependent: true })).toBe(50_000)
  })
  it('1,200万円 → 上限15万円（収入1,000万でクランプ）', () => {
    expect(incomeAdjustmentDeduction(12_000_000, { selfSpecialDisability: true })).toBe(150_000)
  })
  it('特別障害者の扶養親族でも対象', () => {
    expect(incomeAdjustmentDeduction(9_000_000, { specialDisabilityFamily: true })).toBe(50_000)
  })
})
