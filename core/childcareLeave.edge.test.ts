import { describe, it, expect } from 'vitest'
import { getTaxTable } from '@data/taxTables/index'
import { computeChildcareLeave } from './childcareLeave'

// 育休日数・給付金・社保免除の境界ケース（閏年・1日・年末14日・低月給・181日境界）。
const cfg = getTaxTable(2025).childcareLeaveBenefit!

describe('育児休業の境界ケース', () => {
  it('閏年（2024/2/29 を跨ぐ）の暦日数', () => {
    const r = computeChildcareLeave(
      { startDate: '2024-02-25', endDate: '2024-03-05', preMonthlySalary: 300_000 },
      cfg,
    )
    // 2/25,26,27,28,29 ＋ 3/1〜5 = 10日
    expect(r.leaveDays).toBe(10)
  })

  it('1日だけの育休', () => {
    const r = computeChildcareLeave(
      { startDate: '2025-05-15', endDate: '2025-05-15', preMonthlySalary: 300_000 },
      cfg,
    )
    expect(r.leaveDays).toBe(1)
    expect(r.benefit).toBe(6_700) // floor(10,000 × 1 × 0.67)
  })

  it('年末ちょうど14日（12/18〜12/31）: 月末育休で免除1か月', () => {
    const r = computeChildcareLeave(
      { startDate: '2025-12-18', endDate: '2025-12-31', preMonthlySalary: 300_000 },
      cfg,
    )
    expect(r.leaveDays).toBe(14)
    expect(r.exemptMonths).toBe(1) // 12/31が育休中
  })

  it('低月給（賃金日額が上限未満）', () => {
    const r = computeChildcareLeave(
      { startDate: '2025-05-01', endDate: '2025-05-31', preMonthlySalary: 30_000 },
      cfg,
    )
    // 賃金日額 round(30,000/30)=1,000、31日×0.67×1,000
    expect(r.benefit).toBe(20_770)
  })

  it('ちょうど181日（50%が1日だけ乗る境界）', () => {
    const r = computeChildcareLeave(
      { startDate: '2025-01-01', endDate: '2025-06-30', preMonthlySalary: 300_000 },
      cfg,
    )
    // 1〜6月 = 31+28+31+30+31+30 = 181日。早期180×0.67(=120.6) ＋ 後期1×0.50 = 121.1 → ×10,000
    expect(r.leaveDays).toBe(181)
    expect(r.benefit).toBe(1_211_000)
  })
})
