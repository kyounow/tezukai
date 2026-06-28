import { describe, it, expect } from 'vitest'
import {
  medicalExpenseDeduction,
  medicalExpenseDetail,
  lifeInsuranceDeduction,
  earthquakeInsuranceDeduction,
  smallEnterpriseDeduction,
} from './extraDeductions'

describe('医療費控除', () => {
  it('通常: (支払−保険金)−min(10万, 総所得×5%)', () => {
    // 総所得500万→足切り10万。30万−10万=20万
    expect(medicalExpenseDeduction({ paid: 300_000 }, 5_000_000)).toBe(200_000)
  })
  it('保険金等で補填される分を差し引く', () => {
    expect(medicalExpenseDeduction({ paid: 300_000, reimbursed: 50_000 }, 5_000_000)).toBe(150_000)
  })
  it('総所得200万未満は足切りが総所得×5%', () => {
    // 総所得150万→足切り7.5万。10万−7.5万=2.5万
    expect(medicalExpenseDeduction({ paid: 100_000 }, 1_500_000)).toBe(25_000)
  })
  it('足切り以下は0', () => {
    expect(medicalExpenseDeduction({ paid: 80_000 }, 5_000_000)).toBe(0)
  })
  it('セルフメディケーション: 購入費−1.2万（上限8.8万）', () => {
    expect(medicalExpenseDeduction({ selfMedicationPaid: 30_000 }, 5_000_000)).toBe(18_000)
    expect(medicalExpenseDeduction({ selfMedicationPaid: 200_000 }, 5_000_000)).toBe(88_000)
  })
  it('通常とセルフメディケーションは有利な方を自動採用', () => {
    expect(medicalExpenseDeduction({ paid: 300_000, selfMedicationPaid: 200_000 }, 5_000_000)).toBe(200_000)
  })

  it('採用した方法を返す（通常 / セルフメディケーション）', () => {
    // 通常20万 > セルフ8.8万 → 通常
    expect(medicalExpenseDetail({ paid: 300_000, selfMedicationPaid: 200_000 }, 5_000_000)).toMatchObject({
      method: 'normal',
      amount: 200_000,
    })
    // 通常0（足切り以下）< セルフ1.8万 → セルフメディケーション
    expect(medicalExpenseDetail({ paid: 80_000, selfMedicationPaid: 30_000 }, 5_000_000)).toMatchObject({
      method: 'selfMedication',
      amount: 18_000,
    })
  })
})

describe('生命保険料控除', () => {
  it('新制度・所得税: 80,000円超は区分上限40,000円', () => {
    expect(lifeInsuranceDeduction({ general: { newAmount: 100_000 } }, 'incomeTax')).toBe(40_000)
  })
  it('新制度・所得税: 60,000円→×1/4+20,000＝35,000', () => {
    expect(lifeInsuranceDeduction({ general: { newAmount: 60_000 } }, 'incomeTax')).toBe(35_000)
  })
  it('新制度・住民税: 区分上限28,000円', () => {
    expect(lifeInsuranceDeduction({ general: { newAmount: 100_000 } }, 'residentTax')).toBe(28_000)
  })
  it('旧制度・所得税: 100,000円→×1/4+25,000＝50,000', () => {
    expect(lifeInsuranceDeduction({ general: { oldAmount: 100_000 } }, 'incomeTax')).toBe(50_000)
  })
  it('新旧併用は区分上限(新40,000)で頭打ち・旧のみとの有利な方', () => {
    // 新5万→32,500、旧6万→40,000。併用min(72,500,40,000)=40,000 vs 旧40,000 → 40,000
    expect(lifeInsuranceDeduction({ general: { newAmount: 50_000, oldAmount: 60_000 } }, 'incomeTax')).toBe(40_000)
  })
  it('3区分フルは合計上限（所得税12万／住民税7万）', () => {
    const input = {
      general: { newAmount: 100_000 },
      nursingMedical: { newAmount: 100_000 },
      pension: { newAmount: 100_000 },
    }
    expect(lifeInsuranceDeduction(input, 'incomeTax')).toBe(120_000)
    expect(lifeInsuranceDeduction(input, 'residentTax')).toBe(70_000)
  })
  it('介護医療は新制度のみ（旧は無視）', () => {
    expect(lifeInsuranceDeduction({ nursingMedical: { newAmount: 100_000, oldAmount: 100_000 } }, 'incomeTax')).toBe(40_000)
  })
})

describe('地震保険料控除', () => {
  it('所得税: 地震保険料は全額・上限5万円', () => {
    expect(earthquakeInsuranceDeduction({ earthquake: 30_000 }, 'incomeTax')).toBe(30_000)
    expect(earthquakeInsuranceDeduction({ earthquake: 80_000 }, 'incomeTax')).toBe(50_000)
  })
  it('住民税: 地震保険料は1/2・上限2.5万円', () => {
    expect(earthquakeInsuranceDeduction({ earthquake: 30_000 }, 'residentTax')).toBe(15_000)
    expect(earthquakeInsuranceDeduction({ earthquake: 60_000 }, 'residentTax')).toBe(25_000)
  })
  it('旧長期損害保険料の段階式（所得税）', () => {
    expect(earthquakeInsuranceDeduction({ oldLongTerm: 15_000 }, 'incomeTax')).toBe(12_500) // ×1/2+5,000
    expect(earthquakeInsuranceDeduction({ oldLongTerm: 25_000 }, 'incomeTax')).toBe(15_000) // 上限
  })
  it('地震＋旧長期の合算は上限で頭打ち（所得税5万）', () => {
    expect(earthquakeInsuranceDeduction({ earthquake: 40_000, oldLongTerm: 25_000 }, 'incomeTax')).toBe(50_000)
  })
})

describe('小規模企業共済等掛金控除（iDeCo）', () => {
  it('支払掛金の全額', () => {
    expect(smallEnterpriseDeduction(276_000)).toBe(276_000)
    expect(smallEnterpriseDeduction(0)).toBe(0)
  })
})
