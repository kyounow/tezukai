import type { ChildcareLeaveBenefitConfig } from '@data/taxTables/types'
import { getTaxTable } from '@data/taxTables/index'
import type { ChildcareLeaveInput } from './types'

/**
 * 育児休業（育休）の計算。給与所得者が育休を取得した年の概算に使う。分割育休（複数期間）に対応。
 *
 * - 育児休業給付金 = 賃金日額 ×（通算180日まで67% ＋ 181日〜50%）。賃金日額は月給/30（上限あり）で近似。
 *   給付率の67%/50%は分割しても育休開始からの通算日数で判定する。
 * - 出生後休業支援給付金 = 賃金日額 × min(通算育休日数, 28) × 13%（両親とも14日以上育休時）。
 * - いずれも非課税・社会保険料の算定対象外。
 * - 社会保険料免除月数 = 全期間の和集合で「月末が育休中」または「同一月に14日以上育休」の暦月数（令和4.10〜）。
 * - 給与減（課税）は月給×通算育休日数/30 の日割り近似。
 *
 * 年またぎ: 第3引数 year を渡すと、その暦年内の育休日数のみを当年分として計算する（税は暦年課税のため）。
 * 給付率67%/50%は育休開始からの通算で判定するので、前年までの育休日数（priorDays）を踏まえて当年分の率を決める。
 * year 省略時は全期間を1年として扱う（後方互換）。年をまたぐ育休は税年度を切り替えて各年を確認する。
 * 出典: 厚労省「育児休業等給付について」、日本年金機構（保険料免除）。
 */
export interface ChildcareLeaveResult {
  /** 育休日数（暦日・両端含む。year指定時は当年内の通算日数）。 */
  leaveDays: number
  /** 社会保険料が免除される月数。 */
  exemptMonths: number
  /** 育児休業給付金（年額・非課税）。 */
  benefit: number
  /** 出生後休業支援給付金（非課税）。 */
  postBirthBenefit: number
  /** 非課税給付金の合計。 */
  total: number
  /** 課税給与の減額（月給×通算育休日数/30）。 */
  salaryReduction: number
  /** 育休の期間数（分割育休なら2以上）。 */
  periodCount: number
}

interface Interval {
  start: Date
  end: Date
}

const DAY_MS = 86_400_000
const EMPTY: ChildcareLeaveResult = {
  leaveDays: 0,
  exemptMonths: 0,
  benefit: 0,
  postBirthBenefit: 0,
  total: 0,
  salaryReduction: 0,
  periodCount: 0,
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

/** 両端含む暦日数。 */
function inclusiveDays(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1
}

/** 期間を開始日順にソートし、重なる区間をマージ（和集合）して返す。日数の二重計上を防ぐ。 */
function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime())
  const out: Interval[] = []
  for (const iv of sorted) {
    const last = out[out.length - 1]
    // 重なる場合のみマージ（隣接＝翌日開始は別期間として残す＝分割回数を保つ）。
    if (last && iv.start.getTime() <= last.end.getTime()) {
      if (iv.end.getTime() > last.end.getTime()) last.end = iv.end
    } else {
      out.push({ start: iv.start, end: iv.end })
    }
  }
  return out
}

/** 全期間（重なりマージ済み）の和集合で社会保険料免除月数を数える（月末育休 or 月内14日以上）。 */
function countExemptMonths(intervals: Interval[]): number {
  if (intervals.length === 0) return 0
  const minStart = Math.min(...intervals.map((iv) => iv.start.getTime()))
  const maxEnd = Math.max(...intervals.map((iv) => iv.end.getTime()))
  const first = new Date(minStart)
  const last = new Date(maxEnd)
  let y = first.getUTCFullYear()
  let m = first.getUTCMonth() // 0-based
  const endY = last.getUTCFullYear()
  const endM = last.getUTCMonth()
  let count = 0
  while (y < endY || (y === endY && m <= endM)) {
    const monthStart = Date.UTC(y, m, 1)
    const monthEnd = new Date(Date.UTC(y, m + 1, 0)) // その月の末日
    // マージ済みなので同一月内の区間は重ならず、月内の育休日数は単純に合算してよい。
    let unionDays = 0
    let monthEndInLeave = false
    for (const iv of intervals) {
      const oS = Math.max(iv.start.getTime(), monthStart)
      const oE = Math.min(iv.end.getTime(), monthEnd.getTime())
      if (oE >= oS) unionDays += Math.floor((oE - oS) / DAY_MS) + 1
      if (monthEnd.getTime() >= iv.start.getTime() && monthEnd.getTime() <= iv.end.getTime()) monthEndInLeave = true
    }
    if (monthEndInLeave || unionDays >= 14) count++
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
  year?: number,
): ChildcareLeaveResult {
  if (!cfg) return EMPTY
  const monthly = Math.max(0, Math.floor(input.preMonthlySalary))
  // 各期間をパースし、不正（日付不正・終了<開始）を除外。
  const parsed: Interval[] = (input.periods ?? [])
    .map((p) => ({ start: parseDate(p.startDate), end: parseDate(p.endDate) }))
    .filter((p): p is Interval => p.start !== null && p.end !== null && p.end.getTime() >= p.start.getTime())
  if (monthly <= 0 || parsed.length === 0) return EMPTY

  // 重なりをマージして和集合に（分割で同じ日を二重に数えない）。
  const merged = mergeIntervals(parsed)

  // 対象年度で区間をクリップ（税は暦年課税のため当年の暦日のみ計算）。year未指定なら全期間（後方互換）。
  const yearStart = year != null ? Date.UTC(year, 0, 1) : -Infinity
  const yearEnd = year != null ? Date.UTC(year, 11, 31) : Infinity
  let priorDays = 0 // 当年より前の育休日数（給付率67%/50%の通算判定に使う）。
  const clipped: Interval[] = []
  for (const iv of merged) {
    if (year != null) {
      const beforeEnd = Math.min(iv.end.getTime(), yearStart - DAY_MS)
      if (beforeEnd >= iv.start.getTime()) priorDays += Math.floor((beforeEnd - iv.start.getTime()) / DAY_MS) + 1
    }
    const cS = Math.max(iv.start.getTime(), yearStart)
    const cE = Math.min(iv.end.getTime(), yearEnd)
    if (cE >= cS) clipped.push({ start: new Date(cS), end: new Date(cE) })
  }
  const leaveDays = clipped.reduce((sum, iv) => sum + inclusiveDays(iv.start, iv.end), 0)
  if (leaveDays <= 0) return EMPTY

  // 賃金日額＝月給/30（上限あり）。
  const dailyWage = Math.min(Math.round(monthly / 30), cfg.dailyWageCap)

  // 育児休業給付金: 育休開始からの通算で180日まで67%、以降50%。当年の日は通算 priorDays+1〜priorDays+leaveDays。
  const earlyDays = Math.min(leaveDays, Math.max(0, cfg.earlyDays - priorDays))
  const lateDays = leaveDays - earlyDays
  const benefit = Math.floor(dailyWage * (earlyDays * cfg.earlyRate + lateDays * cfg.lateRate))

  // 出生後休業支援給付金: 通算28日のうち当年に入る分 ×賃金日額×13%。
  const postBirthDays = input.postBirthSupport
    ? Math.min(leaveDays, Math.max(0, cfg.postBirthMaxDays - priorDays))
    : 0
  const postBirthBenefit = Math.floor(postBirthDays * dailyWage * cfg.postBirthRate)

  const exemptMonths = countExemptMonths(clipped)
  const salaryReduction = Math.floor((monthly * leaveDays) / 30)

  return {
    leaveDays,
    exemptMonths,
    benefit,
    postBirthBenefit,
    total: benefit + postBirthBenefit,
    salaryReduction,
    periodCount: clipped.length,
  }
}
