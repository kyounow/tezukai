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
})
