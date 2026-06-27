import { getTaxTable } from '@data/taxTables/index'
import type { DeductionBracket } from '@data/taxTables/2025'
import type { TaxTable } from '@data/taxTables/types'
import type { LifeInsuranceCategoryInput, LifeInsuranceInput, MedicalExpenseInput, MedicalMethod } from '../types'
import type { TaxKind } from './deductions'

/** 段階式 deduction = 支払額×rate + plus（区分の上限は最終ブラケットの plus で表現）。 */
function bracketAmount(brackets: readonly DeductionBracket[], amount: number): number {
  if (amount <= 0) return 0
  const b = brackets.find((br) => br.upTo === null || amount <= br.upTo)
  if (!b) return 0
  return Math.floor(amount * b.rate + b.plus)
}

/**
 * 医療費控除。通常の医療費控除とセルフメディケーション税制は排他だが、
 * 有利な方を自動採用する。所得税・住民税で同額。
 * 控除額 = max(0,(支払医療費−保険金等)−min(足切り額, 総所得金額等×5%))、上限あり。
 * 出典: 国税庁 No.1120 / No.1129。
 */
export interface MedicalExpenseDetail {
  /** 採用した控除額（有利な方）。 */
  amount: number
  /** 採用した方法。 */
  method: MedicalMethod
  /** 通常の医療費控除の額。 */
  normal: number
  /** セルフメディケーション税制の額。 */
  selfMedication: number
}

/** 医療費控除の通常・セルフメディケーション両方を計算し、有利な方と採用方法を返す。 */
export function medicalExpenseDetail(
  input: MedicalExpenseInput,
  totalIncome: number,
  table: TaxTable = getTaxTable(),
): MedicalExpenseDetail {
  const cfg = table.medicalExpense
  if (!cfg) return { amount: 0, method: 'normal', normal: 0, selfMedication: 0 }
  const floor = Math.min(cfg.floorAmount, Math.floor(Math.max(0, totalIncome) * cfg.floorRate))
  const normal = Math.min(cfg.cap, Math.max(0, (input.paid ?? 0) - (input.reimbursed ?? 0) - floor))
  const selfMedication = Math.min(
    cfg.selfMedication.cap,
    Math.max(0, (input.selfMedicationPaid ?? 0) - cfg.selfMedication.floor),
  )
  // 同額・両方0のときは通常を採用。
  const useSelfMed = selfMedication > normal
  return {
    amount: useSelfMed ? selfMedication : normal,
    method: useSelfMed ? 'selfMedication' : 'normal',
    normal,
    selfMedication,
  }
}

export function medicalExpenseDeduction(
  input: MedicalExpenseInput,
  totalIncome: number,
  table: TaxTable = getTaxTable(),
): number {
  return medicalExpenseDetail(input, totalIncome, table).amount
}

/**
 * 生命保険料控除。区分（一般／介護医療／個人年金）ごとに新旧制度から有利選択し、
 * 区分上限・3区分合計上限を適用する。所得税用と住民税用で上限が異なる。
 * 出典: 国税庁 No.1140、自治体公式（住民税）。
 */
export function lifeInsuranceDeduction(
  input: LifeInsuranceInput,
  kind: TaxKind,
  table: TaxTable = getTaxTable(),
): number {
  const cfg = table.lifeInsurance
  if (!cfg) return 0

  const category = (cat: LifeInsuranceCategoryInput | undefined, allowOld: boolean): number => {
    if (!cat) return 0
    const newCalc = bracketAmount(cfg.newRegime[kind], cat.newAmount ?? 0)
    const oldCalc = allowOld ? bracketAmount(cfg.oldRegime[kind], cat.oldAmount ?? 0) : 0
    if ((cat.newAmount ?? 0) > 0 && (cat.oldAmount ?? 0) > 0 && allowOld) {
      // 新旧併用は合計を区分上限（新制度の上限）で頭打ち、旧のみとの有利な方。
      return Math.max(oldCalc, Math.min(newCalc + oldCalc, cfg.combinedCategoryCap[kind]))
    }
    return Math.max(newCalc, oldCalc)
  }

  // 介護医療保険料は新制度のみ（旧制度に区分なし）。
  const sum = category(input.general, true) + category(input.nursingMedical, false) + category(input.pension, true)
  return Math.min(sum, cfg.totalCap[kind])
}

/** 小規模企業共済等掛金控除（iDeCo 等）。支払掛金の全額が控除（所得税・住民税同額）。出典: 国税庁 No.1135。 */
export function smallEnterpriseDeduction(annualAmount: number): number {
  return Math.max(0, Math.floor(annualAmount))
}
