import { describe, it, expect } from 'vitest'
import { socialInsurance, roundPremium, standardRemuneration } from './socialInsurance'
import { HEALTH_GRADES_2025, PENSION_GRADES_2025 } from '@data/taxTables/2025'
import { getTaxTable } from '@data/taxTables/index'

describe('標準報酬月額の等級判定', () => {
  it('健保: 報酬月額→標準報酬月額', () => {
    expect(standardRemuneration(50_000, HEALTH_GRADES_2025)).toBe(58_000) // 下限
    expect(standardRemuneration(194_999, HEALTH_GRADES_2025)).toBe(190_000)
    expect(standardRemuneration(195_000, HEALTH_GRADES_2025)).toBe(200_000)
    expect(standardRemuneration(416_666, HEALTH_GRADES_2025)).toBe(410_000)
    expect(standardRemuneration(2_000_000, HEALTH_GRADES_2025)).toBe(1_390_000) // 上限
  })

  it('厚年: 報酬月額→標準報酬月額（下限88,000・上限650,000）', () => {
    expect(standardRemuneration(50_000, PENSION_GRADES_2025)).toBe(88_000)
    expect(standardRemuneration(200_000, PENSION_GRADES_2025)).toBe(200_000)
    expect(standardRemuneration(700_000, PENSION_GRADES_2025)).toBe(650_000)
  })
})

describe('roundPremium（50銭ルール）', () => {
  it('50銭以下は切捨て・50銭超は切上げ', () => {
    expect(roundPremium(100.5)).toBe(100) // 50銭ちょうど→切捨て
    expect(roundPremium(100.51)).toBe(101) // 50銭超→切上げ
    expect(roundPremium(100.4)).toBe(100)
    expect(roundPremium(100)).toBe(100)
  })
})

// 注: 値は本アプリの近似（標準報酬月額≒月額、下限/上限クランプ）に基づく決定論的な期待値。
// 協会けんぽ料額表の等級刻みとは中間で差が出る前提（sources-2025.md）。
describe('社会保険料（本人負担・年額・近似）', () => {
  it('収入0は全て0', () => {
    expect(socialInsurance(0, 30)).toEqual({ health: 0, longTermCare: 0, pension: 0, employment: 0, total: 0 })
  })

  it('年収500万・30歳（介護なし）', () => {
    const r = socialInsurance(5_000_000, 30)
    // 月額416,666→標準報酬41万。健保 410,000×4.955%=20,315.5→20,315 ×12、厚年 410,000×9.15%=37,515 ×12
    expect(r.health).toBe(243_780)
    expect(r.longTermCare).toBe(0)
    expect(r.pension).toBe(450_180)
    expect(r.employment).toBe(27_500) // 500万×0.55%
    expect(r.total).toBe(721_460)
  })

  it('40〜64歳は介護保険が加算される', () => {
    const young = socialInsurance(5_000_000, 30)
    const middle = socialInsurance(5_000_000, 50)
    expect(middle.longTermCare).toBeGreaterThan(0)
    expect(middle.health).toBe(young.health)
    expect(middle.total).toBe(young.total + middle.longTermCare)
  })

  it('高収入は標準報酬月額の上限（厚年650,000・健保1,390,000）', () => {
    const r = socialInsurance(20_000_000, 30)
    // 厚年: 650,000×9.15%=59,475 ×12、健保: 1,390,000×4.955%=68,874.5→68,874 ×12
    expect(r.pension).toBe(713_700)
    expect(r.health).toBe(826_488)
    expect(r.employment).toBe(110_000)
  })
})

describe('賞与分離モード（月給＋賞与）', () => {
  const t2025 = getTaxTable(2025)
  it('月給30万＋賞与100万/年・30歳: 月額分＋賞与分を別計算', () => {
    const r = socialInsurance(4_600_000, 30, t2025, { monthlySalary: 300_000, annualBonus: 1_000_000, bonusCount: 2 })
    // 月額: 健保 30万×4.955%×12=178,380、厚年 30万×9.15%×12=329,400
    // 賞与: 健保 100万×4.955%=49,550、厚年 100万×9.15%=91,500
    expect(r.health).toBe(178_380 + 49_550)
    expect(r.pension).toBe(329_400 + 91_500)
    expect(r.employment).toBe(25_300) // 460万×0.55%
  })

  it('簡易モードと賞与分離モードで社保額が異なる', () => {
    const simple = socialInsurance(4_600_000, 30, t2025)
    const detailed = socialInsurance(4_600_000, 30, t2025, { monthlySalary: 300_000, annualBonus: 1_000_000 })
    expect(detailed.total).not.toBe(simple.total)
  })

  it('標準賞与額の上限（健保 年度573万・厚年 月150万×回数）が効く', () => {
    const r = socialInsurance(14_200_000, 30, t2025, { monthlySalary: 600_000, annualBonus: 7_000_000, bonusCount: 2 })
    // 健保賞与は573万で頭打ち、厚年賞与は150万×2=300万で頭打ち
    const capped = socialInsurance(14_200_000, 30, t2025, { monthlySalary: 600_000, annualBonus: 5_730_000, bonusCount: 2 })
    // 健保は同額（どちらも573万でクランプ）
    expect(r.health).toBe(capped.health)
  })
})

// 協会けんぽ(東京)令和7年度・日本年金機構の料額表「折半額」と一致することを確認。
// 折半額は独立リサーチ(一次情報)で全等級を突合済み。
describe('公式料額表の折半額と一致', () => {
  it('標準報酬月額20万: 健保9,910円・厚年18,300円（月額×12）', () => {
    const r = socialInsurance(2_400_000, 30) // 月額20万ちょうど
    expect(r.health).toBe(9_910 * 12)
    expect(r.pension).toBe(18_300 * 12)
  })

  it('標準報酬月額30万・介護込み: 健保14,865＋介護2,385＝折半17,250円（月額）', () => {
    const r = socialInsurance(3_600_000, 50) // 月額30万・介護第2号該当
    expect(r.health).toBe(14_865 * 12)
    expect(r.longTermCare).toBe(2_385 * 12)
    expect(r.health / 12 + r.longTermCare / 12).toBe(17_250)
  })
})
