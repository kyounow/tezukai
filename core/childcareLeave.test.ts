import { describe, it, expect } from 'vitest'
import { getTaxTable } from '@data/taxTables/index'
import { computeChildcareLeave } from './childcareLeave'
import { calculateTakeHome } from './takeHome'

const cfg = getTaxTable(2025).childcareLeaveBenefit!

describe('育児休業給付金の計算', () => {
  it('月給30万・育休6か月（184日）: 180日67%＋超過50%、社保免除6か月', () => {
    const r = computeChildcareLeave(
      { startDate: '2025-05-01', endDate: '2025-10-31', preMonthlySalary: 300_000 },
      cfg,
    )
    expect(r.leaveDays).toBe(184) // 5/1〜10/31
    // 賃金日額10,000 ×(180×0.67 + 4×0.50)=1,226,000
    expect(r.benefit).toBe(1_226_000)
    expect(r.postBirthBenefit).toBe(0)
    expect(r.exemptMonths).toBe(6) // 5〜10月の月末が育休中
    expect(r.salaryReduction).toBe(1_840_000) // 30万×184/30
  })

  it('出生後休業支援給付金（28日×13%）が上乗せされる', () => {
    const r = computeChildcareLeave(
      { startDate: '2025-05-01', endDate: '2025-10-31', preMonthlySalary: 300_000, postBirthSupport: true },
      cfg,
    )
    expect(r.postBirthBenefit).toBe(36_400) // 28日×10,000×13%
    expect(r.total).toBe(1_226_000 + 36_400)
  })

  it('賃金日額の上限16,110円が効く（高月給）', () => {
    const r = computeChildcareLeave(
      { startDate: '2025-01-01', endDate: '2025-06-29', preMonthlySalary: 600_000 },
      cfg,
    )
    // 180日（1/1〜6/29＝180日）×67%、日額は16,110で頭打ち＝6×323,811
    expect(r.leaveDays).toBe(180)
    expect(r.benefit).toBe(1_942_866)
  })

  it('社保免除の月判定: 月内14日以上、または月末が育休中', () => {
    // 5/1〜5/14（14日・月末でない）→ 14日以上で免除1か月
    expect(computeChildcareLeave({ startDate: '2025-05-01', endDate: '2025-05-14', preMonthlySalary: 300_000 }, cfg).exemptMonths).toBe(1)
    // 5/1〜5/13（13日・月末でない）→ 免除なし
    expect(computeChildcareLeave({ startDate: '2025-05-01', endDate: '2025-05-13', preMonthlySalary: 300_000 }, cfg).exemptMonths).toBe(0)
    // 5/20〜5/31（12日だが月末が育休）→ 免除1か月
    expect(computeChildcareLeave({ startDate: '2025-05-20', endDate: '2025-05-31', preMonthlySalary: 300_000 }, cfg).exemptMonths).toBe(1)
  })

  it('不正な入力（終了<開始・月給0・日付なし）は全て0', () => {
    expect(computeChildcareLeave({ startDate: '2025-10-01', endDate: '2025-05-01', preMonthlySalary: 300_000 }, cfg).total).toBe(0)
    expect(computeChildcareLeave({ startDate: '2025-05-01', endDate: '2025-10-31', preMonthlySalary: 0 }, cfg).total).toBe(0)
    expect(computeChildcareLeave({ startDate: '', endDate: '', preMonthlySalary: 300_000 }, cfg).total).toBe(0)
  })
})

describe('育休が手取りに反映される（統合）', () => {
  it('給付金（非課税）を手取りに加算し、社保は免除月を除く', () => {
    const r = calculateTakeHome({
      salaryIncome: 3_600_000, // 月給30万×12
      age: 30,
      taxYear: 2025,
      childcareLeave: { startDate: '2025-05-01', endDate: '2025-10-31', preMonthlySalary: 300_000 },
    })
    expect(r.childcareLeave?.total).toBe(1_226_000)
    expect(r.childcareLeave?.exemptMonths).toBe(6)
    expect(r.childcareLeave?.leaveDays).toBe(184)
    // 課税給与は育休日数ぶん減（grossIncome＝就労分の給与）
    expect(r.grossIncome).toBe(3_600_000 - 1_840_000)
    // 手取り＝就労分の手取り＋非課税給付金。育休なしより社保・税は減り、給付金が乗る。
    const noLeave = calculateTakeHome({ salaryIncome: 3_600_000, age: 30, taxYear: 2025 })
    expect(r.socialInsurance.total).toBeLessThan(noLeave.socialInsurance.total) // 6か月免除
    expect(r.takeHome).toBe(r.grossIncome - r.totalBurden + 1_226_000)
  })
})
