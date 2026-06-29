import type { ChildcareLeaveBenefitConfig } from '@data/taxTables/types'
import { getTaxTable } from '@data/taxTables/index'
import type { ChildcareLeaveInput } from './types'

/**
 * 育児休業（育休）の計算。給与所得者が育休を取得した年の概算に使う。
 *
 * - 育児休業給付金 = 賃金日額 ×（180日まで67% ＋ 181日〜50%）。賃金日額は月給/30（上限あり）で近似。
 * - 出生後休業支援給付金 = 賃金日額 × min(育休日数, 28) × 13%（両親とも14日以上育休時）。
 * - いずれも非課税・社会保険料の算定対象外。
 * - 社会保険料免除月数 = 育休期間で「月末が育休中」または「同一月に14日以上育休」の暦月数（令和4.10〜）。
 * - 給与減（課税）は月給×育休日数/30 の日割り近似。
 * 出典: 厚労省「育児休業等給付について」、日本年金機構（保険料免除）。
 */
export interface ChildcareLeaveResult {
  /** 育休日数（暦日・両端含む）。 */
  leaveDays: number
  /** 社会保険料が免除される月数。 */
  exemptMonths: number
  /** 育児休業給付金（年額・非課税）。 */
  benefit: number
  /** 出生後休業支援給付金（非課税）。 */
  postBirthBenefit: number
  /** 非課税給付金の合計。 */
  total: number
  /** 課税給与の減額（月給×育休日数/30）。 */
  salaryReduction: number
}

const DAY_MS = 86_400_000
const EMPTY: ChildcareLeaveResult = {
  leaveDays: 0,
  exemptMonths: 0,
  benefit: 0,
  postBirthBenefit: 0,
  total: 0,
  salaryReduction: 0,
}

// 日付計算はすべて UTC で行う（夏時間のある地域でも getTime 差分が暦日数とずれないようにするため）。
/** YYYY-MM-DD を UTC の Date に。不正なら null。 */
function parseDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s ?? '')
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const date = new Date(Date.UTC(y, mo - 1, d))
  // 2/30 などの繰り上がりを弾く。
  if (date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null
  return date
}

/** 育休期間で社会保険料が免除される暦月数を数える（月末育休 or 月内14日以上）。 */
function countExemptMonths(start: Date, end: Date): number {
  let count = 0
  let y = start.getUTCFullYear()
  let m = start.getUTCMonth() // 0-based
  const endY = end.getUTCFullYear()
  const endM = end.getUTCMonth()
  while (y < endY || (y === endY && m <= endM)) {
    const monthEnd = new Date(Date.UTC(y, m + 1, 0)) // その月の末日
    const overlapStart = Math.max(start.getTime(), Date.UTC(y, m, 1))
    const overlapEnd = Math.min(end.getTime(), monthEnd.getTime())
    const overlapDays = overlapEnd >= overlapStart ? Math.floor((overlapEnd - overlapStart) / DAY_MS) + 1 : 0
    const monthEndInLeave = monthEnd.getTime() >= start.getTime() && monthEnd.getTime() <= end.getTime()
    if (monthEndInLeave || overlapDays >= 14) count++
    m++
    if (m > 11) {
      m = 0
      y++
    }
  }
  return count
}

export function computeChildcareLeave(
  input: ChildcareLeaveInput,
  cfg: ChildcareLeaveBenefitConfig | undefined = getTaxTable().childcareLeaveBenefit,
): ChildcareLeaveResult {
  if (!cfg) return EMPTY
  const start = parseDate(input.startDate)
  const end = parseDate(input.endDate)
  const monthly = Math.max(0, Math.floor(input.preMonthlySalary))
  if (!start || !end || monthly <= 0) return EMPTY
  const leaveDays = Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1
  if (leaveDays <= 0) return EMPTY

  // 賃金日額＝月給/30（上限あり）。
  const dailyWage = Math.min(Math.round(monthly / 30), cfg.dailyWageCap)

  // 育児休業給付金: 180日まで67%、以降50%。
  const earlyDays = Math.min(leaveDays, cfg.earlyDays)
  const lateDays = Math.max(0, leaveDays - cfg.earlyDays)
  const benefit = Math.floor(dailyWage * (earlyDays * cfg.earlyRate + lateDays * cfg.lateRate))

  // 出生後休業支援給付金: min(育休日数,28)×賃金日額×13%。
  const postBirthBenefit = input.postBirthSupport
    ? Math.floor(Math.min(leaveDays, cfg.postBirthMaxDays) * dailyWage * cfg.postBirthRate)
    : 0

  const exemptMonths = countExemptMonths(start, end)
  const salaryReduction = Math.floor((monthly * leaveDays) / 30)

  return {
    leaveDays,
    exemptMonths,
    benefit,
    postBirthBenefit,
    total: benefit + postBirthBenefit,
    salaryReduction,
  }
}
