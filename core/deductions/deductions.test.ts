import { describe, it, expect } from 'vitest'
import {
  basicDeduction,
  spouseDeduction,
  spouseTotalIncome,
  dependentDeduction,
  specialRelativeDeduction,
  personalDeduction,
  familyDisabilityDeduction,
} from './deductions'

describe('基礎控除（令和7年）', () => {
  it('所得税は合計所得で段階（令和7・8年分の時限上乗せ込み）', () => {
    expect(basicDeduction(1_000_000, 'incomeTax')).toBe(950_000) // ≤132万
    expect(basicDeduction(2_000_000, 'incomeTax')).toBe(880_000) // ≤336万
    expect(basicDeduction(5_000_000, 'incomeTax')).toBe(630_000) // ≤655万
    expect(basicDeduction(7_000_000, 'incomeTax')).toBe(580_000) // 本則
    expect(basicDeduction(24_200_000, 'incomeTax')).toBe(320_000)
    expect(basicDeduction(26_000_000, 'incomeTax')).toBe(0)
  })

  it('住民税は最大43万円（据え置き）', () => {
    expect(basicDeduction(5_000_000, 'residentTax')).toBe(430_000)
    expect(basicDeduction(24_200_000, 'residentTax')).toBe(290_000)
    expect(basicDeduction(26_000_000, 'residentTax')).toBe(0)
  })
})

describe('配偶者控除・配偶者特別控除', () => {
  it('配偶者の給与収入123万以下（合計所得58万以下）は配偶者控除', () => {
    // 本人所得400万、配偶者給与100万→合計所得35万 → 一般38万
    expect(spouseDeduction(4_000_000, { salaryIncome: 1_000_000 }, 'incomeTax')).toBe(380_000)
    expect(spouseDeduction(4_000_000, { salaryIncome: 1_000_000 }, 'residentTax')).toBe(330_000)
  })

  it('老人控除対象配偶者', () => {
    expect(spouseDeduction(4_000_000, { salaryIncome: 0, elderly: true }, 'incomeTax')).toBe(480_000)
    expect(spouseDeduction(4_000_000, { salaryIncome: 0, elderly: true }, 'residentTax')).toBe(380_000)
  })

  it('配偶者の給与収入150万（合計所得85万）は配偶者特別控除', () => {
    // 配偶者所得58万超95万以下 → 本人900万以下で38万
    expect(spouseDeduction(4_000_000, { salaryIncome: 1_500_000 }, 'incomeTax')).toBe(380_000)
    expect(spouseDeduction(4_000_000, { salaryIncome: 1_500_000 }, 'residentTax')).toBe(330_000)
  })

  it('本人の合計所得が高いほど控除が逓減（900万超/950万超）', () => {
    expect(spouseDeduction(9_300_000, { salaryIncome: 1_000_000 }, 'incomeTax')).toBe(260_000)
    expect(spouseDeduction(9_800_000, { salaryIncome: 1_000_000 }, 'incomeTax')).toBe(130_000)
  })

  it('本人の合計所得1000万円超は0', () => {
    expect(spouseDeduction(11_000_000, { salaryIncome: 1_000_000 }, 'incomeTax')).toBe(0)
  })

  it('配偶者の合計所得133万円ちょうど付近は配偶者特別控除（境界確認）', () => {
    // 給与収入200万→給与所得132万（=合計所得132万 ≤133万）→ 最終帯3万円
    expect(spouseDeduction(4_000_000, { salaryIncome: 2_000_000 }, 'incomeTax')).toBe(30_000)
  })

  it('配偶者の合計所得133万円超は0', () => {
    // 給与収入210万→給与所得139万 > 133万
    expect(spouseDeduction(4_000_000, { salaryIncome: 2_100_000 }, 'incomeTax')).toBe(0)
  })

  it('配偶者特別控除: バンド境界の遷移（±1円で正しい帯に切り替わる）', () => {
    // 給与収入≤190万は給与所得控除65万の速算式なので 合計所得＝給与収入−65万 が正確に成り立つ。
    // 配偶者控除→特別控除の境界（所得58万）: 控除額は同額38万のまま制度が切り替わる。
    expect(spouseDeduction(4_000_000, { salaryIncome: 1_230_000 }, 'incomeTax')).toBe(380_000) // 所得58万ちょうど＝配偶者控除
    expect(spouseDeduction(4_000_000, { salaryIncome: 1_230_001 }, 'incomeTax')).toBe(380_000) // 58万+1円＝特別控除の第1帯
    // 95万境界: 38万 → 36万
    expect(spouseDeduction(4_000_000, { salaryIncome: 1_600_000 }, 'incomeTax')).toBe(380_000) // 所得95万ちょうど
    expect(spouseDeduction(4_000_000, { salaryIncome: 1_600_001 }, 'incomeTax')).toBe(360_000) // 95万+1円
    // 100万境界: 36万 → 31万
    expect(spouseDeduction(4_000_000, { salaryIncome: 1_650_000 }, 'incomeTax')).toBe(360_000) // 所得100万ちょうど
    expect(spouseDeduction(4_000_000, { salaryIncome: 1_650_001 }, 'incomeTax')).toBe(310_000) // 100万+1円
    // 住民税は58万超〜100万が33万に統合されている帯: 100万ちょうどは33万、超えると下がる
    expect(spouseDeduction(4_000_000, { salaryIncome: 1_650_000 }, 'residentTax')).toBe(330_000)
    expect(spouseDeduction(4_000_000, { salaryIncome: 1_650_001 }, 'residentTax')).toBeLessThan(330_000)
  })
})

describe('配偶者の公的年金収入（公的年金等控除・老人控除対象配偶者）', () => {
  // 出典: 国税庁 No.1600 公的年金等の課税関係（雑所得の速算表・令和2年分以後）。
  // 年金以外の合計所得1,000万円以下の区分。雑所得 = max(0, 収入 × 割合 − 控除額)。
  it('年金150万・70歳以上（65歳以上区分）→合計所得40万→配偶者控除（老人）48万', () => {
    // 65歳以上・110万超330万未満: 150万 × 100% − 110万 = 40万（≤58万＝配偶者控除）。
    const spouse = { salaryIncome: 1_500_000, incomeType: 'pension' as const, pensionOver65: true, elderly: true }
    expect(spouseTotalIncome(spouse)).toBe(400_000)
    expect(spouseDeduction(4_000_000, spouse, 'incomeTax')).toBe(480_000) // 老人控除対象配偶者
    expect(spouseDeduction(4_000_000, spouse, 'residentTax')).toBe(380_000)
  })

  it('年金110万・65歳以上→合計所得0（65歳以上は収入110万まで雑所得ゼロ）', () => {
    const spouse = { salaryIncome: 1_100_000, incomeType: 'pension' as const, pensionOver65: true }
    expect(spouseTotalIncome(spouse)).toBe(0)
    expect(spouseDeduction(4_000_000, spouse, 'incomeTax')).toBe(380_000) // 一般の配偶者控除38万
  })

  it('65歳未満・年金105万→合計所得45万（60万超130万未満: ×100%−60万）', () => {
    const spouse = { salaryIncome: 1_050_000, incomeType: 'pension' as const, pensionOver65: false }
    expect(spouseTotalIncome(spouse)).toBe(450_000)
    expect(spouseDeduction(4_000_000, spouse, 'incomeTax')).toBe(380_000)
  })

  it('収入種別の省略は給与として扱う（後方互換）', () => {
    // 給与100万→給与所得控除65万→給与所得35万。
    expect(spouseTotalIncome({ salaryIncome: 1_000_000 })).toBe(350_000)
  })
})

describe('扶養控除', () => {
  it('区分別人数で合算（所得税）', () => {
    expect(dependentDeduction({ general: 1, specified: 1 }, 'incomeTax')).toBe(1_010_000) // 38万+63万
    expect(dependentDeduction({ elderlyCoLiving: 1, elderlyOther: 1 }, 'incomeTax')).toBe(1_060_000) // 58万+48万
  })

  it('住民税', () => {
    expect(dependentDeduction({ specified: 2 }, 'residentTax')).toBe(900_000) // 45万×2
  })

  it('扶養なしは0', () => {
    expect(dependentDeduction({}, 'incomeTax')).toBe(0)
  })
})

describe('特定親族特別控除（令和7年新設）', () => {
  it('合計所得70万（58万超85万以下）は63万（所得税）/45万（住民税）', () => {
    expect(specialRelativeDeduction([700_000], 'incomeTax')).toBe(630_000)
    expect(specialRelativeDeduction([700_000], 'residentTax')).toBe(450_000)
  })

  it('58万円以下は対象外（扶養控除側）', () => {
    expect(specialRelativeDeduction([580_000], 'incomeTax')).toBe(0)
  })

  it('123万円超は0', () => {
    expect(specialRelativeDeduction([1_300_000], 'incomeTax')).toBe(0)
  })

  it('複数人を合算', () => {
    expect(specialRelativeDeduction([700_000, 1_000_000], 'incomeTax')).toBe(630_000 + 410_000)
  })
})

describe('本人の属性による所得控除（障害者・ひとり親・寡婦・勤労学生）', () => {
  // 出典: 国税庁 No.1160（障害者控除）/No.1170（寡婦控除）/No.1171（ひとり親控除）/No.1175（勤労学生控除）。
  // 障害者: 普通27万/26万・特別40万/30万。ひとり親35万/30万。寡婦27万/26万。勤労学生27万/26万（所得税/住民税）。
  it('障害者控除: 普通は27万（所得税）/26万（住民税）', () => {
    expect(personalDeduction({ disability: 'normal' }, 4_000_000, 'incomeTax')).toBe(270_000)
    expect(personalDeduction({ disability: 'normal' }, 4_000_000, 'residentTax')).toBe(260_000)
  })

  it('障害者控除: 特別は40万（所得税）/30万（住民税）。所得要件なし（高所得でも適用）', () => {
    expect(personalDeduction({ disability: 'special' }, 30_000_000, 'incomeTax')).toBe(400_000)
    expect(personalDeduction({ disability: 'special' }, 30_000_000, 'residentTax')).toBe(300_000)
  })

  it('ひとり親控除: 35万/30万（合計所得500万円以下）', () => {
    expect(personalDeduction({ singleParent: true }, 5_000_000, 'incomeTax')).toBe(350_000)
    expect(personalDeduction({ singleParent: true }, 5_000_000, 'residentTax')).toBe(300_000)
  })

  it('ひとり親控除: 合計所得500万円超は0（所得要件ゲート）', () => {
    expect(personalDeduction({ singleParent: true }, 5_000_001, 'incomeTax')).toBe(0)
  })

  it('寡婦控除: 27万/26万。ひとり親と同時指定時はひとり親を優先し重複しない', () => {
    expect(personalDeduction({ widow: true }, 5_000_000, 'incomeTax')).toBe(270_000)
    expect(personalDeduction({ widow: true }, 5_000_000, 'residentTax')).toBe(260_000)
    // 両方 true でも合算せずひとり親のみ（35万）。
    expect(personalDeduction({ singleParent: true, widow: true }, 4_000_000, 'incomeTax')).toBe(350_000)
  })

  it('勤労学生控除: 27万/26万（合計所得75万円以下）。超えると0', () => {
    expect(personalDeduction({ workingStudent: true }, 750_000, 'incomeTax')).toBe(270_000)
    expect(personalDeduction({ workingStudent: true }, 750_000, 'residentTax')).toBe(260_000)
    expect(personalDeduction({ workingStudent: true }, 750_001, 'incomeTax')).toBe(0)
  })

  it('障害者（特別）＋ひとり親は合算', () => {
    expect(personalDeduction({ disability: 'special', singleParent: true }, 3_000_000, 'incomeTax')).toBe(
      400_000 + 350_000,
    )
  })

  it('該当なし・none は0', () => {
    expect(personalDeduction({}, 4_000_000, 'incomeTax')).toBe(0)
    expect(personalDeduction({ disability: 'none' }, 4_000_000, 'incomeTax')).toBe(0)
  })
})

describe('同一生計配偶者・扶養親族の障害者控除', () => {
  // 出典: 国税庁 No.1160（障害者控除）。所得要件なし。
  // 控除額（所得税/住民税）: 普通27万/26万・特別（同居以外）40万/30万・同居特別75万/53万。
  it('普通障害者は27万（所得税）/26万（住民税）×人数', () => {
    expect(familyDisabilityDeduction({ normal: 2 }, 'incomeTax')).toBe(540_000)
    expect(familyDisabilityDeduction({ normal: 2 }, 'residentTax')).toBe(520_000)
  })

  it('特別障害者（同居以外）は40万（所得税）/30万（住民税）×人数', () => {
    expect(familyDisabilityDeduction({ special: 1 }, 'incomeTax')).toBe(400_000)
    expect(familyDisabilityDeduction({ special: 1 }, 'residentTax')).toBe(300_000)
  })

  it('同居特別障害者は75万（所得税）/53万（住民税）×人数', () => {
    expect(familyDisabilityDeduction({ coLivingSpecial: 1 }, 'incomeTax')).toBe(750_000)
    expect(familyDisabilityDeduction({ coLivingSpecial: 1 }, 'residentTax')).toBe(530_000)
  })

  it('区分混在を合算', () => {
    expect(familyDisabilityDeduction({ normal: 1, special: 1, coLivingSpecial: 1 }, 'incomeTax')).toBe(
      270_000 + 400_000 + 750_000,
    )
    expect(familyDisabilityDeduction({ normal: 1, special: 1, coLivingSpecial: 1 }, 'residentTax')).toBe(
      260_000 + 300_000 + 530_000,
    )
  })

  it('該当なしは0', () => {
    expect(familyDisabilityDeduction({}, 'incomeTax')).toBe(0)
  })
})
