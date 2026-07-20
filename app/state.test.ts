import { describe, it, expect } from 'vitest'
import { defaultForm, toInput, estimateGrossSalary, switchToActual, type FormState } from './state'

// app 状態層のテスト（app 層初のテスト）。実額（源泉徴収票）モードの toInput 分岐と
// 見込みモードの回帰固定、実額タブのプリフィルヘルパを検証する。純粋関数のみで DOM は使わない。

/** 育休・賞与分離・組合健保・拡張控除・共有入力を盛った実額モードのフォーム。 */
function actualFormWithEverything(): FormState {
  return {
    ...defaultForm,
    inputMode: 'actual',
    actualSalary: 6_000_000,
    actualSocialInsurance: 850_000,
    actualWithholding: 120_000,
    // 実額モードでは無視される（出力に含めないことを固定するため敢えて有効値を入れる）はずの見込み側入力。
    bonusMode: true,
    monthlySalary: 400_000,
    annualBonus: 1_200_000,
    healthInsuranceType: 'kumiai',
    childcareLeave: true,
    childcareLeavePeriods: [{ start: '2025-04-01', end: '2025-10-31' }],
    // 実額モードでも共有される入力。
    hasSpouse: true,
    spouseSalaryIncome: 0,
    depGeneral: 1,
    idecoAnnual: 240_000,
    housingEnabled: true,
    housingBalance: 20_000_000,
    otherBusiness: 100_000,
    residentGradeLevel: 2,
  }
}

describe('toInput の実額（源泉徴収票）モード分岐', () => {
  it('実額モードは childcareLeave / salaryBreakdown / healthInsurance を出力から除外する', () => {
    const out = toInput(actualFormWithEverything())
    // 育休は si 以外に課税給与減額・給付金加算にも効くため、実額モードでは必ず除外する。
    expect(out.childcareLeave).toBeUndefined()
    // 賞与分離・組合健保も実額 si と二重反映になるため除外。
    expect(out.salaryBreakdown).toBeUndefined()
    expect(out.healthInsurance).toBeUndefined()
  })

  it('実額モード（給与所得者）は socialInsuranceActual と employmentIncomeMethod=table を設定する', () => {
    const out = toInput(actualFormWithEverything())
    expect(out.socialInsuranceActual).toEqual({ total: 850_000 })
    expect(out.employmentIncomeMethod).toBe('table')
    // 額面は actualSalary をそのまま使う（賞与分離の月給×12＋賞与ではない）。
    expect(out.salaryIncome).toBe(6_000_000)
  })

  it('実額モードの社保0円も { total: 0 } として渡す（未指定＝通常計算と区別）', () => {
    const out = toInput({ ...defaultForm, inputMode: 'actual', actualSalary: 4_000_000, actualSocialInsurance: 0 })
    expect(out.socialInsuranceActual).toEqual({ total: 0 })
  })

  it('実額モードでも共有入力（配偶者・扶養・iDeCo・住宅ローン・給与以外の所得・住民税級地）は渡す', () => {
    const out = toInput(actualFormWithEverything())
    expect(out.spouse).toBeDefined()
    expect(out.dependents?.general).toBe(1)
    expect(out.idecoAnnual).toBe(240_000)
    expect(out.housingLoan).toBeDefined()
    expect(out.otherIncome?.business).toBe(100_000)
    expect(out.residentGradeLevel).toBe(2)
  })

  it('個人事業主の実額モードは employmentIncomeMethod を設定しない（給与所得者のみ）が socialInsuranceActual・business は設定する', () => {
    const out = toInput({
      ...defaultForm,
      mode: 'soleProprietor',
      inputMode: 'actual',
      actualSocialInsurance: 500_000,
      busRevenue: 8_000_000,
      busExpenses: 3_000_000,
    })
    expect(out.employmentIncomeMethod).toBeUndefined()
    expect(out.socialInsuranceActual).toEqual({ total: 500_000 })
    expect(out.business).toEqual({ revenue: 8_000_000, expenses: 3_000_000, blueDeduction: defaultForm.blueDeduction })
  })
})

describe('toInput の見込みモード（回帰固定）', () => {
  it('見込みモードは socialInsuranceActual / employmentIncomeMethod が undefined', () => {
    const out = toInput(defaultForm)
    expect(out.socialInsuranceActual).toBeUndefined()
    expect(out.employmentIncomeMethod).toBeUndefined()
  })

  it('見込みモードは bonusMode / 組合健保 / childcareLeave を従来どおり反映する', () => {
    const out = toInput({
      ...defaultForm,
      inputMode: 'estimate',
      bonusMode: true,
      monthlySalary: 400_000,
      annualBonus: 1_200_000,
      healthInsuranceType: 'kumiai',
      childcareLeave: true,
      childcareLeavePeriods: [{ start: '2025-04-01', end: '2025-10-31' }],
    })
    expect(out.salaryBreakdown).toEqual({ monthlySalary: 400_000, annualBonus: 1_200_000, bonusCount: defaultForm.bonusCount })
    // 額面は 月給×12＋年間賞与。
    expect(out.salaryIncome).toBe(400_000 * 12 + 1_200_000)
    expect(out.healthInsurance).toBeDefined()
    expect(out.childcareLeave).toBeDefined()
  })
})

describe('実額タブのプリフィル', () => {
  it('estimateGrossSalary は通常モードで salaryIncome を返す', () => {
    expect(estimateGrossSalary({ ...defaultForm, bonusMode: false, salaryIncome: 5_500_000 })).toBe(5_500_000)
  })

  it('estimateGrossSalary は賞与分離モードで 月給×12＋年間賞与 を返す', () => {
    expect(estimateGrossSalary({ ...defaultForm, bonusMode: true, monthlySalary: 300_000, annualBonus: 900_000 })).toBe(
      300_000 * 12 + 900_000,
    )
  })

  it('switchToActual は初回（actualSalary===0）に見込み額面をコピーして actual に切替', () => {
    const patch = switchToActual({ ...defaultForm, salaryIncome: 5_000_000, actualSalary: 0 })
    expect(patch.inputMode).toBe('actual')
    expect(patch.actualSalary).toBe(5_000_000)
  })

  it('switchToActual は既に入力済み（actualSalary!==0）なら actualSalary を上書きしない', () => {
    const patch = switchToActual({ ...defaultForm, salaryIncome: 5_000_000, actualSalary: 7_000_000 })
    expect(patch.inputMode).toBe('actual')
    expect(patch.actualSalary).toBeUndefined()
  })
})
