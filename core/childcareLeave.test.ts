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

describe('月またぎ育休の復職月は14日ルール対象外（令和4.10〜）', () => {
  // 14日ルールは「同一月内に開始・終了する育休」限定。月をまたぐ育休の復職月（月途中で復帰）は、
  // 月末が育休でなければ非免除（日本年金機構リーフレット・令和4年10月改正）。
  it('1/10〜7/20: 復職月の7月は月末が就労のため非免除（免除は1〜6月の6か月）', () => {
    const r = computeChildcareLeave(
      { periods: [{ startDate: '2025-01-10', endDate: '2025-07-20' }], preMonthlySalary: 300_000 },
      cfg,
    )
    expect(r.leaveDays).toBe(192) // 1/10〜7/20（22+28+31+30+31+30+20）
    // 7月は7/1〜7/20の20日あるが、育休は1月開始で同月内完結でないため14日ルール対象外。7/31は就労。
    expect(r.exemptMonths).toBe(6) // 1〜6月の月末が育休中
  })

  it('5/1〜5/14: 同月内に開始・終了する14日以上は免除（同月完結は対象・回帰ガード）', () => {
    const r = computeChildcareLeave(
      { periods: [{ startDate: '2025-05-01', endDate: '2025-05-14' }], preMonthlySalary: 300_000 },
      cfg,
    )
    expect(r.exemptMonths).toBe(1)
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

describe('年またぎの育休（暦年でクリップ）', () => {
  // 育休 2025/11/1〜2026/4/30（181日）。月給30万＝賃金日額10,000。
  const crossYear = { periods: [{ startDate: '2025-11-01', endDate: '2026-04-30' }], preMonthlySalary: 300_000 }

  it('year未指定なら全期間を1年として扱う（後方互換）', () => {
    const r = computeChildcareLeave(crossYear, cfg)
    expect(r.leaveDays).toBe(181)
    // 180×0.67 + 1×0.50 = 121.1 → ×10,000
    expect(r.benefit).toBe(1_211_000)
    expect(r.exemptMonths).toBe(6)
  })

  it('令和7（2025）分: 11・12月の61日のみ。全て通算180日以内で67%', () => {
    const r = computeChildcareLeave(crossYear, cfg, 2025)
    expect(r.leaveDays).toBe(61) // 11月30＋12月31
    expect(r.benefit).toBe(408_700) // 10,000×61×0.67
    expect(r.exemptMonths).toBe(2) // 11・12月の月末が育休
    expect(r.salaryReduction).toBe(610_000) // 30万×61/30
  })

  it('令和8（2026）分: 1〜4月の120日。前年61日があるので通算で一部が50%', () => {
    const r = computeChildcareLeave(crossYear, cfg, 2026)
    expect(r.leaveDays).toBe(120) // 1〜4月
    // 前年61日 → 当年は通算62〜181日目。67%は180日目まで＝当年119日、50%が1日
    expect(r.benefit).toBe(802_300) // 10,000×(119×0.67 + 1×0.50)
    expect(r.exemptMonths).toBe(4) // 1〜4月
    expect(r.salaryReduction).toBe(1_200_000) // 30万×120/30
  })

  it('出生後支援は当年に入る28日分のみ（前年で使い切れば翌年は0）', () => {
    const withSupport = { ...crossYear, postBirthSupport: true }
    expect(computeChildcareLeave(withSupport, cfg, 2025).postBirthBenefit).toBe(36_400) // 28日×10,000×13%
    expect(computeChildcareLeave(withSupport, cfg, 2026).postBirthBenefit).toBe(0) // 前年で28日消化
  })

  it('復職月が翌年（12/20〜翌1/15）・year=翌年: 1月は同月完結でなく月末就労のため免除0（クリップ×同月判定の相互作用）', () => {
    const r = computeChildcareLeave(
      { periods: [{ startDate: '2025-12-20', endDate: '2026-01-15' }], preMonthlySalary: 300_000 },
      cfg,
      2026,
    )
    expect(r.leaveDays).toBe(15) // 1/1〜1/15（当年クリップ後）
    // 育休は前年12月開始のため1月は「同月内に開始・終了」に該当せず、1/31も就労 → 免除0。
    // クリップ後の区間（1/1〜1/15）で同月判定すると誤って15日≥14で免除に見える罠をクリップ前区間で回避。
    expect(r.exemptMonths).toBe(0)
  })

  it('税年度ごとに手取りへ正しく反映される（統合）', () => {
    const base = { salaryIncome: 3_600_000, age: 30, childcareLeave: crossYear } as const
    const y2025 = calculateTakeHome({ ...base, taxYear: 2025 })
    expect(y2025.childcareLeave?.leaveDays).toBe(61)
    expect(y2025.childcareLeave?.total).toBe(408_700)
    expect(y2025.grossIncome).toBe(3_600_000 - 610_000) // 課税給与は61日分だけ減
    const y2026 = calculateTakeHome({ ...base, taxYear: 2026 })
    expect(y2026.childcareLeave?.leaveDays).toBe(120)
    expect(y2026.grossIncome).toBe(3_600_000 - 1_200_000)
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
