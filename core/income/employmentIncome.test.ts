import { describe, it, expect } from 'vitest'
import { getTaxTable } from '@data/taxTables/index'
import { employmentIncome, employmentIncomeDeduction } from './employmentIncome'

const t2025 = getTaxTable(2025)
const t2026 = getTaxTable(2026)

// 令和7年分（最低保障65万円）。出典: 国税庁 No.1410
describe('給与所得控除（令和7年分）', () => {
  it('収入0は控除0', () => {
    expect(employmentIncomeDeduction(0)).toBe(0)
  })

  it('低収入では控除は収入が上限（給与所得は0）', () => {
    expect(employmentIncomeDeduction(600_000)).toBe(600_000)
    expect(employmentIncome(600_000)).toBe(0)
  })

  it('190万まで＝最低保障65万円', () => {
    expect(employmentIncomeDeduction(1_900_000)).toBe(650_000)
    expect(employmentIncome(1_900_000)).toBe(1_250_000)
  })

  it('190万超〜360万＝収入×30%+8万', () => {
    expect(employmentIncomeDeduction(2_000_000)).toBe(680_000)
    expect(employmentIncome(2_000_000)).toBe(1_320_000)
  })

  it('360万超〜660万＝収入×20%+44万（年収500万→給与所得356万）', () => {
    expect(employmentIncomeDeduction(5_000_000)).toBe(1_440_000)
    expect(employmentIncome(5_000_000)).toBe(3_560_000)
  })

  it('660万境界＝収入×20%+44万', () => {
    expect(employmentIncomeDeduction(6_600_000)).toBe(1_760_000)
    expect(employmentIncome(6_600_000)).toBe(4_840_000)
  })

  it('660万超〜850万＝収入×10%+110万', () => {
    expect(employmentIncomeDeduction(8_500_000)).toBe(1_950_000)
    expect(employmentIncome(8_500_000)).toBe(6_550_000)
  })

  it('850万超＝上限195万円', () => {
    expect(employmentIncomeDeduction(10_000_000)).toBe(1_950_000)
    expect(employmentIncome(10_000_000)).toBe(8_050_000)
    expect(employmentIncomeDeduction(20_000_000)).toBe(1_950_000)
  })
})

// 別表第五（電算機特例）: 給与収入660万円未満は収入を4,000円区分に丸めてから速算式を適用する。
// 源泉徴収票・確定申告の「給与所得控除後の給与等の金額」と一致させる方式（employmentIncomeMethod='table'）。
// 出典: 国税庁 令和7年分 確定申告の手引き「手順2 収入金額等、所得金額を計算する」
//   （https://www.nta.go.jp/taxes/shiraberu/shinkoku/tebiki/2025/03/order2/3-2_06.htm）
//   ＝ 給与所得 = A×… （A＝給与収入÷4の千円未満切捨て）。所得税法別表第五と一致。
describe('給与所得 別表第五（電算機特例・令和7年分）', () => {
  it('既定は formula（従来の速算式・1円単位）で挙動不変', () => {
    // formula: 4,321,900 − floor(4,321,900×0.2+440,000)=4,321,900−1,304,380 = 3,017,520
    expect(employmentIncome(4_321_900, t2025)).toBe(3_017_520)
    expect(employmentIncome(4_321_900, t2025, 'formula')).toBe(3_017_520)
  })

  it('収入4,320,000〜4,323,999 の区分は給与所得3,016,000（出典: 手順2 A×3.2−440,000, A=1,080,000）', () => {
    // 別表第五: A=収入÷4千円未満切捨=1,080,000 → 給与所得=1,080,000×3.2−440,000=3,016,000。
    // （＝丸め後収入4,320,000 に速算式: 4,320,000−(4,320,000×0.2+440,000)=3,016,000）
    expect(employmentIncome(4_320_000, t2025, 'table')).toBe(3_016_000)
    expect(employmentIncome(4_321_900, t2025, 'table')).toBe(3_016_000)
    expect(employmentIncome(4_323_999, t2025, 'table')).toBe(3_016_000)
    // 次の4,000円区分（4,324,000〜）は 4,324,000×0.8−440,000 = 3,019,200
    expect(employmentIncome(4_324_000, t2025, 'table')).toBe(3_019_200)
  })

  it('4,000円刻みの中間値は formula と table で差が出る', () => {
    // 4,321,900: formula 3,017,520 / table 3,016,000（区分下限に丸められる分だけ table が小さい）
    expect(employmentIncome(4_321_900, t2025, 'formula')).toBe(3_017_520)
    expect(employmentIncome(4_321_900, t2025, 'table')).toBe(3_016_000)
    expect(employmentIncome(4_321_900, t2025, 'formula')).not.toBe(employmentIncome(4_321_900, t2025, 'table'))
  })

  it('4,000円の倍数は formula と table が一致', () => {
    for (const income of [2_000_000, 2_500_000, 4_320_000, 5_000_000]) {
      expect(employmentIncome(income, t2025, 'table')).toBe(employmentIncome(income, t2025, 'formula'))
    }
  })

  it('収入2,500,000〜2,503,999 の区分は給与所得1,670,000（出典: 手順2 A×2.8−80,000, A=625,000）', () => {
    // 190万超〜360万帯。A=収入÷4千円未満切捨=625,000 → 625,000×2.8−80,000=1,670,000。
    expect(employmentIncome(2_500_000, t2025, 'table')).toBe(1_670_000)
    expect(employmentIncome(2_501_000, t2025, 'table')).toBe(1_670_000)
    expect(employmentIncome(2_503_999, t2025, 'table')).toBe(1_670_000)
  })

  it('660万円以上は table でも直接計算（1円未満切捨て）で formula と一致', () => {
    // 6,600,000 ちょうど・7,000,000 とも別表第五の対象外（≥660万）。両方式一致。
    expect(employmentIncome(6_600_000, t2025, 'table')).toBe(employmentIncome(6_600_000, t2025, 'formula'))
    expect(employmentIncome(7_000_000, t2025, 'table')).toBe(5_200_000)
    expect(employmentIncome(7_000_000, t2025, 'table')).toBe(employmentIncome(7_000_000, t2025, 'formula'))
    // 直前（6,599,999）は table 対象。区分下限6,596,000 に丸める。
    // 6,596,000×0.8−440,000 = 4,836,800
    expect(employmentIncome(6_599_999, t2025, 'table')).toBe(4_836_800)
  })

  it('最低保障帯（収入190万以下・定額控除65万）は table でも収入から直接控除し formula と一致', () => {
    // 定額控除（rate 0）帯は区分丸めをしない（確定申告 手順2「650,999円以下→0円」＝直接控除と一致）。
    expect(employmentIncome(1_500_000, t2025, 'table')).toBe(850_000) // 1,500,000−650,000
    expect(employmentIncome(1_500_000, t2025, 'table')).toBe(employmentIncome(1_500_000, t2025, 'formula'))
    // 非4,000円倍数でも直接控除（丸めない）＝ formula と一致
    expect(employmentIncome(1_502_000, t2025, 'table')).toBe(852_000)
    expect(employmentIncome(1_502_000, t2025, 'table')).toBe(employmentIncome(1_502_000, t2025, 'formula'))
    // 収入650,000以下は給与所得0
    expect(employmentIncome(650_000, t2025, 'table')).toBe(0)
  })

  it('収入0・負値は table でも0', () => {
    expect(employmentIncome(0, t2025, 'table')).toBe(0)
    expect(employmentIncome(-100, t2025, 'table')).toBe(0)
  })
})

// 令和8年分は別表第五の公表サンプル値を取得できなかったため、電算機特例のアルゴリズム論理のみを検証する。
// 令和8改正: 給与所得控除の最低保障 65万→74万（最低保障帯は収入220万まで）。出典: 2026.ts / 国税庁「令和8年4月源泉所得税の改正のあらまし」。
describe('給与所得 別表第五（電算機特例・令和8年分のロジック）', () => {
  it('4,000円の倍数は formula と table が一致（速算式帯）', () => {
    for (const income of [3_000_000, 5_000_000]) {
      expect(employmentIncome(income, t2026, 'table')).toBe(employmentIncome(income, t2026, 'formula'))
    }
  })

  it('速算式帯の非倍数は区分下限に丸められ table ≤ formula', () => {
    // 3,001,000 → 区分下限3,000,000。table は formula より小さい（丸め分）。
    const formula = employmentIncome(3_001_000, t2026, 'formula')
    const table = employmentIncome(3_001_000, t2026, 'table')
    expect(table).toBe(employmentIncome(3_000_000, t2026, 'formula'))
    expect(table).toBeLessThan(formula)
  })

  it('最低保障74万帯（収入220万以下）は直接控除で formula と一致', () => {
    expect(employmentIncome(2_000_000, t2026, 'table')).toBe(employmentIncome(2_000_000, t2026, 'formula'))
    expect(employmentIncome(2_001_000, t2026, 'table')).toBe(employmentIncome(2_001_000, t2026, 'formula'))
  })
})
