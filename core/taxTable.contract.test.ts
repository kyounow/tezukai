import { describe, it, expect } from 'vitest'
import { TAX_TABLES } from '@data/taxTables/index'
import type { AmountByIncomeBand, DeductionBracket, ProgressiveBracket, StandardRemunerationGrade } from '@data/taxTables/2025'
import type { TaxTable } from '@data/taxTables/types'

/**
 * 登録済みの全 TaxTable が満たすべき不変条件を検証する契約テスト。
 * 新しい税年度を追加したとき、ここが緑であれば構造的な健全性が担保される。
 */

/** upTo 区分が昇順で、null（上限なし）が末尾に1つだけあることを確認。 */
function assertBandsAscendingWithNullLast(items: readonly { upTo: number | null }[]): void {
  expect(items.length).toBeGreaterThan(0)
  let prev = -Infinity
  items.forEach((it, i) => {
    if (it.upTo === null) {
      expect(i).toBe(items.length - 1) // null は末尾のみ
    } else {
      expect(it.upTo).toBeGreaterThan(prev)
      prev = it.upTo
    }
  })
}

function assertRate(rate: number): void {
  expect(rate).toBeGreaterThan(0)
  expect(rate).toBeLessThan(1)
}

function assertGrades(grades: readonly StandardRemunerationGrade[]): void {
  expect(grades.length).toBeGreaterThan(0)
  expect(grades[0].lower).toBe(0) // 最下級の下限は0
  for (let i = 1; i < grades.length; i++) {
    expect(grades[i].lower).toBeGreaterThan(grades[i - 1].lower)
    expect(grades[i].standard).toBeGreaterThan(grades[i - 1].standard)
  }
}

describe.each(Object.entries(TAX_TABLES))('TaxTable 契約: %s', (key, table: TaxTable) => {
  it('year がレジストリのキーと一致', () => {
    expect(table.year).toBe(Number(key))
  })

  it('給与所得控除ブラケットが昇順＋上限なし終端', () => {
    assertBandsAscendingWithNullLast(table.employmentIncomeDeduction)
    table.employmentIncomeDeduction.forEach((b: DeductionBracket) => {
      expect(b.rate).toBeGreaterThanOrEqual(0)
      expect(b.plus).toBeGreaterThanOrEqual(0)
    })
  })

  it('所得税速算表が昇順＋上限なし終端、税率は (0,1)', () => {
    assertBandsAscendingWithNullLast(table.incomeTaxBrackets)
    table.incomeTaxBrackets.forEach((b: ProgressiveBracket) => {
      assertRate(b.rate)
      expect(b.deduction).toBeGreaterThanOrEqual(0)
    })
  })

  it('復興特別所得税率は [0,1)', () => {
    expect(table.reconstructionSurtaxRate).toBeGreaterThanOrEqual(0)
    expect(table.reconstructionSurtaxRate).toBeLessThan(1)
  })

  it('基礎控除バンド（所得税・住民税）が昇順＋終端、金額は非負', () => {
    for (const bands of [table.basicDeduction.incomeTax, table.basicDeduction.residentTax]) {
      assertBandsAscendingWithNullLast(bands)
      bands.forEach((b: AmountByIncomeBand) => expect(b.amount).toBeGreaterThanOrEqual(0))
    }
  })

  it('本人所得ティアが昇順、配偶者控除テーブルの幅がティア数と一致', () => {
    const tiers = table.ownerIncomeTiers
    for (let i = 1; i < tiers.length; i++) expect(tiers[i]).toBeGreaterThan(tiers[i - 1])
    for (const kind of ['incomeTax', 'residentTax'] as const) {
      expect(table.spouseDeduction[kind].general.length).toBe(tiers.length)
      expect(table.spouseDeduction[kind].elderly.length).toBe(tiers.length)
      table.spouseSpecialDeduction[kind].forEach((band) => expect(band.amounts.length).toBe(tiers.length))
      assertBandsAscendingWithNullLast(table.spouseSpecialDeduction[kind])
    }
    expect(table.spouseSpecialDeductionIncomeLimit).toBeGreaterThan(table.spouseDeductionIncomeLimit)
  })

  it('特定親族特別控除（あれば）バンドが昇順＋終端、金額は非負', () => {
    if (!table.specialRelativeDeduction) return
    for (const bands of [table.specialRelativeDeduction.incomeTax, table.specialRelativeDeduction.residentTax]) {
      assertBandsAscendingWithNullLast(bands)
      bands.forEach((b) => expect(b.amount).toBeGreaterThanOrEqual(0))
    }
  })

  it('住民税: 所得割の市＋道府県＝合計、料率は (0,1)、均等割/森林税は非負', () => {
    const { incomeRate, perCapita, forestTax, adjustment } = table.residentTax
    expect(incomeRate.city + incomeRate.prefecture).toBeCloseTo(incomeRate.total, 10)
    assertRate(incomeRate.total)
    expect(perCapita.city + perCapita.prefecture).toBe(perCapita.total)
    expect(forestTax).toBeGreaterThanOrEqual(0)
    assertRate(adjustment.rate)
    expect(adjustment.incomeCap).toBeGreaterThan(0)
  })

  it('社会保険料の各料率が (0,1)、介護の年齢範囲が妥当', () => {
    const si = table.socialInsurance
    assertRate(si.health.rate)
    assertRate(si.longTermCare.rate)
    assertRate(si.pension.rate)
    assertRate(si.employment.employeeRate)
    expect(si.longTermCare.maxAge).toBeGreaterThan(si.longTermCare.minAge)
  })

  it('標準報酬月額 等級表（健保・厚年）が昇順で下限0始まり', () => {
    assertGrades(table.healthGrades)
    assertGrades(table.pensionGrades)
  })

  it('住民税 非課税限度額: 全フィールドが正の数', () => {
    const nt = table.residentTaxNonTaxable
    expect(nt.perPerson).toBeGreaterThan(0)
    expect(nt.base).toBeGreaterThan(0)
    expect(nt.perCapitaAddition).toBeGreaterThan(0)
    expect(nt.incomePortionAddition).toBeGreaterThan(0)
  })

  it('調整控除の人的控除差: 全8フィールドが正の数（欠落や0は調整控除を静かに壊す）', () => {
    const d = table.humanDeductionDiff
    for (const key of [
      'basic',
      'spouseGeneral',
      'spouseElderly',
      'spouseSpecial',
      'dependentGeneral',
      'dependentSpecified',
      'dependentElderlyOther',
      'dependentCoLiving',
    ] as const) {
      expect(d[key], `humanDeductionDiff.${key}`).toBeGreaterThan(0)
    }
  })

  it('扶養控除テーブル: 一般・特定・老人（同居/別居）が所得税・住民税とも正の数', () => {
    for (const kind of ['incomeTax', 'residentTax'] as const) {
      const t = table.dependentDeduction[kind]
      expect(t.general, `${kind}.general`).toBeGreaterThan(0)
      expect(t.specified, `${kind}.specified`).toBeGreaterThan(0)
      expect(t.elderlyCoLiving, `${kind}.elderlyCoLiving`).toBeGreaterThan(0)
      expect(t.elderlyOther, `${kind}.elderlyOther`).toBeGreaterThan(0)
      // 特定扶養（19-22歳）> 一般、同居老親 > 別居老人 の大小関係も担保。
      expect(t.specified).toBeGreaterThan(t.general)
      expect(t.elderlyCoLiving).toBeGreaterThan(t.elderlyOther)
    }
  })

  it('配偶者特別控除: 控除額は配偶者所得の増加に対して非増加（バンド金額の並び）', () => {
    for (const kind of ['incomeTax', 'residentTax'] as const) {
      const bands = table.spouseSpecialDeduction[kind]
      for (let tier = 0; tier < table.ownerIncomeTiers.length; tier++) {
        for (let i = 1; i < bands.length; i++) {
          expect(
            bands[i].amounts[tier],
            `${kind} band[${i}] tier[${tier}]`,
          ).toBeLessThanOrEqual(bands[i - 1].amounts[tier])
        }
      }
    }
  })

  // ── optional フィールドの構造検証（存在する年度のみ） ──

  it('医療費控除（あれば）: 足切り・上限・セルフメディケーションが妥当', () => {
    const m = table.medicalExpense
    if (!m) return
    expect(m.floorAmount).toBeGreaterThan(0)
    assertRate(m.floorRate)
    expect(m.cap).toBeGreaterThan(m.floorAmount)
    expect(m.selfMedication.floor).toBeGreaterThan(0)
    expect(m.selfMedication.cap).toBeGreaterThan(m.selfMedication.floor)
  })

  it('生命保険料控除（あれば）: 段階式が昇順＋終端、上限は正の数', () => {
    const l = table.lifeInsurance
    if (!l) return
    for (const regime of [l.newRegime, l.oldRegime]) {
      assertBandsAscendingWithNullLast(regime.incomeTax)
      assertBandsAscendingWithNullLast(regime.residentTax)
    }
    expect(l.combinedCategoryCap.incomeTax).toBeGreaterThan(0)
    expect(l.combinedCategoryCap.residentTax).toBeGreaterThan(0)
    expect(l.totalCap.incomeTax).toBeGreaterThan(0)
    expect(l.totalCap.residentTax).toBeGreaterThan(0)
    if (l.childcareGeneralNew) {
      assertBandsAscendingWithNullLast(l.childcareGeneralNew.incomeTax)
      expect(l.childcareGeneralNew.combinedCap).toBeGreaterThan(0)
    }
  })

  it('地震保険料控除（あれば）: 率は (0,1]、上限は正の数、旧長期は昇順＋終端', () => {
    const e = table.earthquakeInsurance
    if (!e) return
    for (const regime of [e.incomeTax, e.residentTax]) {
      expect(regime.earthquake.rate).toBeGreaterThan(0)
      expect(regime.earthquake.rate).toBeLessThanOrEqual(1)
      expect(regime.earthquake.cap).toBeGreaterThan(0)
      assertBandsAscendingWithNullLast(regime.oldLongTerm)
      expect(regime.totalCap).toBeGreaterThan(0)
    }
  })

  it('住宅ローン控除（あれば）: 控除率・所得上限・住民税繰越・借入限度が妥当', () => {
    const h = table.housingLoan
    if (!h) return
    assertRate(h.creditRate)
    expect(h.incomeLimit).toBeGreaterThan(0)
    assertRate(h.residentCarryover.rate)
    expect(h.residentCarryover.cap).toBeGreaterThan(0)
    expect(h.period.new).toBeGreaterThan(0)
    expect(h.period.used).toBeGreaterThan(0)
    // 借入限度: 各入居年×性能区分が非負で、子育て上乗せは標準以上。
    for (const [year, limits] of Object.entries(h.limits.new)) {
      for (const perf of ['certified', 'zeh', 'energySaving', 'other'] as const) {
        expect(limits[perf], `new[${year}].${perf}`).toBeGreaterThanOrEqual(0)
        const childcare = h.limits.newChildcare[Number(year)]
        if (childcare) expect(childcare[perf]).toBeGreaterThanOrEqual(limits[perf])
      }
    }
  })

  it('国民年金・国保（あれば）: 年額・率・賦課限度が正の数', () => {
    if (table.nationalPension) expect(table.nationalPension.annual).toBeGreaterThan(0)
    const k = table.nationalHealthInsurance
    if (!k) return
    expect(k.basicDeduction).toBeGreaterThan(0)
    for (const cat of [k.medical, k.support, k.longTermCare]) {
      assertRate(cat.incomeRate)
      expect(cat.perCapita).toBeGreaterThan(0)
      expect(cat.cap).toBeGreaterThan(0)
    }
    expect(k.longTermCare.maxAge).toBeGreaterThan(k.longTermCare.minAge)
  })

  it('育児休業給付（あれば）: 給付率は (0,1)、早期>後期、日数・上限が正の数', () => {
    const c = table.childcareLeaveBenefit
    if (!c) return
    assertRate(c.earlyRate)
    assertRate(c.lateRate)
    expect(c.earlyRate).toBeGreaterThan(c.lateRate) // 67% > 50%
    assertRate(c.postBirthRate)
    expect(c.earlyDays).toBeGreaterThan(0)
    expect(c.dailyWageCap).toBeGreaterThan(0)
    expect(c.postBirthMaxDays).toBeGreaterThan(0)
  })
})
