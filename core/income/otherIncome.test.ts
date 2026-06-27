import { describe, it, expect } from 'vitest'
import { otherIncomeTotal } from './otherIncome'

describe('給与以外の所得（総合課税）と損益通算', () => {
  it('事業・不動産の損失はマイナスのまま（給与と通算可）', () => {
    expect(otherIncomeTotal({ business: 1_000_000 })).toBe(1_000_000)
    expect(otherIncomeTotal({ business: -500_000 })).toBe(-500_000)
    expect(otherIncomeTotal({ realEstate: -300_000 })).toBe(-300_000)
  })

  it('雑・配当・一時の損失は通算不可（0扱い）', () => {
    expect(otherIncomeTotal({ miscellaneous: -300_000 })).toBe(0)
    expect(otherIncomeTotal({ dividend: -100_000 })).toBe(0)
    expect(otherIncomeTotal({ temporary: -200_000 })).toBe(0)
  })

  it('一時所得・総合長期譲渡は1/2で算入', () => {
    expect(otherIncomeTotal({ temporary: 1_000_000 })).toBe(500_000)
    expect(otherIncomeTotal({ generalLongTermCapital: 2_000_000 })).toBe(1_000_000)
  })

  it('総合短期譲渡は全額', () => {
    expect(otherIncomeTotal({ generalShortTermCapital: 800_000 })).toBe(800_000)
  })

  it('複合: 事業＋不動産損失＋雑＋一時', () => {
    // 200万 + (−50万) + 30万 + 40万×1/2 = 200万
    expect(
      otherIncomeTotal({ business: 2_000_000, realEstate: -500_000, miscellaneous: 300_000, temporary: 400_000 }),
    ).toBe(2_000_000)
  })
})
