import { describe, it, expect } from 'vitest'
import { calculateTakeHome } from './takeHome'
import { furusatoFromResult } from './furusato/furusato'
import type { TakeHomeInput } from './types'

// 社会保険料の実額オーバーライド（実額＝源泉徴収票モード）。
// 指定時は料率計算をスキップし、社会保険料控除・手取りの両方に実額を使う。
describe('社会保険料の実額オーバーライド', () => {
  it('等価性: 見込みの si.total を実額として注入すると税額・住民税・手取りが一致', () => {
    const base: TakeHomeInput = {
      salaryIncome: 5_000_000,
      age: 40,
      spouse: { salaryIncome: 0 },
      dependents: { general: 1 },
      lifeInsurance: { general: { newAmount: 80_000 } },
    }
    const estimated = calculateTakeHome(base)
    const actual = calculateTakeHome({ ...base, socialInsuranceActual: { total: estimated.socialInsurance.total } })

    // 社保 total が同一なら所得税・住民税・手取り・課税所得はすべて一致する（si 以外は不変）。
    expect(actual.socialInsurance.total).toBe(estimated.socialInsurance.total)
    expect(actual.incomeTax).toBe(estimated.incomeTax)
    expect(actual.residentTax).toBe(estimated.residentTax)
    expect(actual.takeHome).toBe(estimated.takeHome)
    expect(actual.taxableForIncomeTax).toBe(estimated.taxableForIncomeTax)
    expect(actual.taxableForResidentTax).toBe(estimated.taxableForResidentTax)
    expect(actual.incomeTaxDeductions.socialInsurance).toBe(estimated.socialInsurance.total)

    // ただし内訳は 'actual' で4区分は0・source を持つ。
    expect(actual.socialInsurance.source).toBe('actual')
    expect(actual.socialInsurance.health).toBe(0)
    expect(actual.socialInsurance.longTermCare).toBe(0)
    expect(actual.socialInsurance.pension).toBe(0)
    expect(actual.socialInsurance.employment).toBe(0)
    // 見込み側は source 未指定（estimated 扱い）。
    expect(estimated.socialInsurance.source).toBeUndefined()
  })

  it('{ total: 0 } は「社保0円」の有効入力で undefined（通常計算）と結果が異なる', () => {
    const base: TakeHomeInput = { salaryIncome: 5_000_000, age: 30 }
    const normal = calculateTakeHome(base)
    const zeroSi = calculateTakeHome({ ...base, socialInsuranceActual: { total: 0 } })

    expect(zeroSi.socialInsurance.total).toBe(0)
    expect(zeroSi.socialInsurance.source).toBe('actual')
    // 社保0円なので社会保険料控除も0・課税所得が増え税額が上がる・手取りは（社保0のぶん）増える。
    expect(zeroSi.incomeTaxDeductions.socialInsurance).toBe(0)
    expect(zeroSi.incomeTax).toBeGreaterThan(normal.incomeTax)
    expect(zeroSi.residentTax).toBeGreaterThan(normal.residentTax)
    expect(normal.socialInsurance.total).toBeGreaterThan(0)
    expect(zeroSi.takeHome).not.toBe(normal.takeHome)
  })

  it('負値・小数は Math.max(0, Math.floor()) でクランプ', () => {
    const base: TakeHomeInput = { salaryIncome: 5_000_000, age: 30 }
    const negative = calculateTakeHome({ ...base, socialInsuranceActual: { total: -50_000 } })
    expect(negative.socialInsurance.total).toBe(0)
    const fractional = calculateTakeHome({ ...base, socialInsuranceActual: { total: 700_000.9 } })
    expect(fractional.socialInsurance.total).toBe(700_000)
    expect(fractional.socialInsurance.source).toBe('actual')
  })

  it('個人事業主モードでも実額オーバーライドが効く（国民年金＋国保の実額）', () => {
    const base: TakeHomeInput = {
      mode: 'soleProprietor',
      salaryIncome: 0,
      age: 40,
      business: { revenue: 8_000_000, expenses: 3_000_000, blueDeduction: '65' },
    }
    const estimated = calculateTakeHome(base)
    // 国民年金＋国保の実額を別の額（例: 60万）に置換 → si.total がその額になり、控除・手取りに反映。
    const actual = calculateTakeHome({ ...base, socialInsuranceActual: { total: 600_000 } })
    expect(actual.socialInsurance.total).toBe(600_000)
    expect(actual.socialInsurance.source).toBe('actual')
    expect(actual.incomeTaxDeductions.socialInsurance).toBe(600_000)
    expect(actual.socialInsurance.total).not.toBe(estimated.socialInsurance.total)
    // 事業所得・手取りの基礎は si に依存しない（grossIncome は不変）。
    expect(actual.businessIncome).toBe(estimated.businessIncome)
    expect(actual.grossIncome).toBe(estimated.grossIncome)
  })

  it('ふるさと納税の上限は実額 si 経由でも同一 si.total なら見込みと一致（si 非依存の回帰固定）', () => {
    const base: TakeHomeInput = { salaryIncome: 6_000_000, age: 35, spouse: { salaryIncome: 0 } }
    const estimated = calculateTakeHome(base)
    const actual = calculateTakeHome({ ...base, socialInsuranceActual: { total: estimated.socialInsurance.total } })
    const fEstimated = furusatoFromResult(estimated)
    const fActual = furusatoFromResult(actual)
    expect(fActual.limit).toBe(fEstimated.limit)
    expect(fActual.residentTaxIncomePortion).toBe(fEstimated.residentTaxIncomePortion)
  })
})
