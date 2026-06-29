import { describe, it, expect } from 'vitest'
import { getTaxTable } from '@data/taxTables/index'
import { computeChildcareLeave } from './childcareLeave'
import { calculateTakeHome } from './takeHome'

const cfg = getTaxTable(2025).childcareLeaveBenefit!

describe('育児休業給付金の計算', () => {
  it('月給30万・育休6か月（184日）: 180日67%＋超過50%、社保免除6か月', () => {
    const r = computeChildcareLeave(
      { periods: [{ startDate: '2025-05-01', endDate: '2025-10-31' }], preMonthlySalary: 300_000 },
      cfg,
    )
    expect(r.leaveDays).toBe(184) // 5/1〜10/31
    // 賃金日額10,000 ×(180×0.67 + 4×0.50)=1,226,000
    expect(r.benefit).toBe(1_226_000)
    expect(r.postBirthBenefit).toBe(0)
    expect(r.exemptMonths).toBe(6) // 5〜10月の月末が育休中
    expect(r.salaryReduction).toBe(1_840_000) // 30万×184/30
    expect(r.periodCount).toBe(1)
  })

  it('出生後休業支援給付金（28日×13%）が上乗せされる', () => {
    const r = computeChildcareLeave(
      { periods: [{ startDate: '2025-05-01', endDate: '2025-10-31' }], preMonthlySalary: 300_000, postBirthSupport: true },
      cfg,
    )
    expect(r.postBirthBenefit).toBe(36_400) // 28日×10,000×13%
    expect(r.total).toBe(1_226_000 + 36_400)
  })

  it('賃金日額の上限16,110円が効く（高月給）', () => {
    const r = computeChildcareLeave(
      { periods: [{ startDate: '2025-01-01', endDate: '2025-06-29' }], preMonthlySalary: 600_000 },
      cfg,
    )
    // 180日（1/1〜6/29＝180日）×67%、日額は16,110で頭打ち＝6×323,811
    expect(r.leaveDays).toBe(180)
    expect(r.benefit).toBe(1_942_866)
  })

  it('社保免除の月判定: 月内14日以上、または月末が育休中', () => {
    // 5/1〜5/14（14日・月末でない）→ 14日以上で免除1か月
    expect(computeChildcareLeave({ periods: [{ startDate: '2025-05-01', endDate: '2025-05-14' }], preMonthlySalary: 300_000 }, cfg).exemptMonths).toBe(1)
    // 5/1〜5/13（13日・月末でない）→ 免除なし
    expect(computeChildcareLeave({ periods: [{ startDate: '2025-05-01', endDate: '2025-05-13' }], preMonthlySalary: 300_000 }, cfg).exemptMonths).toBe(0)
    // 5/20〜5/31（12日だが月末が育休）→ 免除1か月
    expect(computeChildcareLeave({ periods: [{ startDate: '2025-05-20', endDate: '2025-05-31' }], preMonthlySalary: 300_000 }, cfg).exemptMonths).toBe(1)
  })

  it('不正な入力（終了<開始・月給0・日付なし・期間なし）は全て0', () => {
    expect(computeChildcareLeave({ periods: [{ startDate: '2025-10-01', endDate: '2025-05-01' }], preMonthlySalary: 300_000 }, cfg).total).toBe(0)
    expect(computeChildcareLeave({ periods: [{ startDate: '2025-05-01', endDate: '2025-10-31' }], preMonthlySalary: 0 }, cfg).total).toBe(0)
    expect(computeChildcareLeave({ periods: [{ startDate: '', endDate: '' }], preMonthlySalary: 300_000 }, cfg).total).toBe(0)
    expect(computeChildcareLeave({ periods: [], preMonthlySalary: 300_000 }, cfg).total).toBe(0)
  })
})

describe('分割育休（複数期間）', () => {
  it('2分割: 給付率は通算180日で判定、社保免除は各期間の月で算定', () => {
    // 5/1〜6/30(61日) ＋ 9/1〜10/31(61日) = 通算122日（全て67%）
    const r = computeChildcareLeave(
      {
        periods: [
          { startDate: '2025-05-01', endDate: '2025-06-30' },
          { startDate: '2025-09-01', endDate: '2025-10-31' },
        ],
        preMonthlySalary: 300_000,
      },
      cfg,
    )
    expect(r.leaveDays).toBe(122)
    expect(r.periodCount).toBe(2)
    // 日額10,000 ×122×0.67 = 817,400
    expect(r.benefit).toBe(817_400)
    // 5・6・9・10月の月末が育休中 → 免除4か月（7・8月は就労）
    expect(r.exemptMonths).toBe(4)
    expect(r.salaryReduction).toBe(Math.floor((300_000 * 122) / 30))
  })

  it('通算で180日を超えると超過分が50%（分割でも通算判定）', () => {
    // 100日 ＋ 100日 = 通算200日 → 早期180×0.67 ＋ 後期20×0.50
    const r = computeChildcareLeave(
      {
        periods: [
          { startDate: '2025-01-01', endDate: '2025-04-10' }, // 100日
          { startDate: '2025-06-01', endDate: '2025-09-08' }, // 100日
        ],
        preMonthlySalary: 300_000,
      },
      cfg,
    )
    expect(r.leaveDays).toBe(200)
    // 10,000×(180×0.67 + 20×0.50) = 10,000×130.6 = 1,306,000
    expect(r.benefit).toBe(1_306_000)
  })

  it('同一月の分割は和集合で14日判定（合算14日で免除）', () => {
    // 5/1〜5/7(7日) ＋ 5/20〜5/26(7日) = 月内合計14日（月末でない）→ 免除1か月
    const r = computeChildcareLeave(
      {
        periods: [
          { startDate: '2025-05-01', endDate: '2025-05-07' },
          { startDate: '2025-05-20', endDate: '2025-05-26' },
        ],
        preMonthlySalary: 300_000,
      },
      cfg,
    )
    expect(r.leaveDays).toBe(14)
    expect(r.exemptMonths).toBe(1)
  })

  it('期間の重なりは和集合で二重計上しない', () => {
    // 5/1〜5/14 と 5/10〜5/20 が重複 → 和集合 5/1〜5/20 = 20日
    const r = computeChildcareLeave(
      {
        periods: [
          { startDate: '2025-05-01', endDate: '2025-05-14' },
          { startDate: '2025-05-10', endDate: '2025-05-20' },
        ],
        preMonthlySalary: 300_000,
      },
      cfg,
    )
    expect(r.leaveDays).toBe(20)
    expect(r.periodCount).toBe(1) // 重なりはマージ
  })

  it('不正な期間を含んでも有効な期間だけで計算する', () => {
    const r = computeChildcareLeave(
      {
        periods: [
          { startDate: '2025-05-01', endDate: '2025-06-30' }, // 有効
          { startDate: '2025-09-30', endDate: '2025-09-01' }, // 終了<開始（無効）
        ],
        preMonthlySalary: 300_000,
      },
      cfg,
    )
    expect(r.leaveDays).toBe(61) // 5/1〜6/30 のみ
    expect(r.periodCount).toBe(1)
  })
})

describe('育休が手取りに反映される（統合）', () => {
  it('給付金（非課税）を手取りに加算し、社保は免除月を除く', () => {
    const r = calculateTakeHome({
      salaryIncome: 3_600_000, // 月給30万×12
      age: 30,
      taxYear: 2025,
      childcareLeave: { periods: [{ startDate: '2025-05-01', endDate: '2025-10-31' }], preMonthlySalary: 300_000 },
    })
    expect(r.childcareLeave?.total).toBe(1_226_000)
    expect(r.childcareLeave?.exemptMonths).toBe(6)
    expect(r.childcareLeave?.leaveDays).toBe(184)
    expect(r.childcareLeave?.periodCount).toBe(1)
    // 課税給与は育休日数ぶん減（grossIncome＝就労分の給与）
    expect(r.grossIncome).toBe(3_600_000 - 1_840_000)
    // 手取り＝就労分の手取り＋非課税給付金。育休なしより社保・税は減り、給付金が乗る。
    const noLeave = calculateTakeHome({ salaryIncome: 3_600_000, age: 30, taxYear: 2025 })
    expect(r.socialInsurance.total).toBeLessThan(noLeave.socialInsurance.total) // 6か月免除
    expect(r.takeHome).toBe(r.grossIncome - r.totalBurden + 1_226_000)
  })

  it('分割育休も手取りに反映される', () => {
    const r = calculateTakeHome({
      salaryIncome: 3_600_000,
      age: 30,
      taxYear: 2025,
      childcareLeave: {
        periods: [
          { startDate: '2025-05-01', endDate: '2025-06-30' },
          { startDate: '2025-09-01', endDate: '2025-10-31' },
        ],
        preMonthlySalary: 300_000,
      },
    })
    expect(r.childcareLeave?.periodCount).toBe(2)
    expect(r.childcareLeave?.leaveDays).toBe(122)
    expect(r.childcareLeave?.total).toBe(817_400)
  })
})
