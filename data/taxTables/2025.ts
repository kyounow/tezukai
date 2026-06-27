/**
 * 令和7年（2025）税率・控除データ。
 *
 * 出典の詳細・年度対応・採用した近似は data/taxTables/sources-2025.md を参照。
 * 原則として「所得税＝令和7年分」「個人住民税＝令和8年度（令和7年所得）」で統一。
 * すべて円単位。各数値の一次情報は行コメントの URL を参照。
 */

export const TAX_YEAR_2025 = 2025 as const

// ─────────────────────────────────────────────────────────────
// 給与所得控除（令和7年分・最低保障65万円）
// 出典: 国税庁 No.1410 https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm
// deduction = min(収入, 収入×rate + plus) を upTo の区分で適用する。
// （収入660万円未満は本来は別表第五の4,000円刻み表だが、本アプリは速算式で近似）
// ─────────────────────────────────────────────────────────────
export interface DeductionBracket {
  /** この区分の給与収入の上限（円）。null は上限なし。 */
  readonly upTo: number | null
  readonly rate: number
  readonly plus: number
}

export const EMPLOYMENT_INCOME_DEDUCTION_2025: readonly DeductionBracket[] = [
  { upTo: 1_900_000, rate: 0, plus: 650_000 }, // 〜190万: 65万円（最低保障）
  { upTo: 3_600_000, rate: 0.3, plus: 80_000 }, // 190万超〜360万: 収入×30%+8万
  { upTo: 6_600_000, rate: 0.2, plus: 440_000 }, // 360万超〜660万: 収入×20%+44万
  { upTo: 8_500_000, rate: 0.1, plus: 1_100_000 }, // 660万超〜850万: 収入×10%+110万
  { upTo: null, rate: 0, plus: 1_950_000 }, // 850万超: 195万円（上限）
]

// ─────────────────────────────────────────────────────────────
// 所得税の速算表（令和7年分。税率テーブル自体は改正なし）
// 出典: 国税庁 No.2260 https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm
// 税額 = 課税所得 × rate − deduction
// ─────────────────────────────────────────────────────────────
export interface ProgressiveBracket {
  /** 課税所得の上限（円）。null は上限なし。 */
  readonly upTo: number | null
  readonly rate: number
  readonly deduction: number
}

export const INCOME_TAX_BRACKETS_2025: readonly ProgressiveBracket[] = [
  { upTo: 1_949_000, rate: 0.05, deduction: 0 },
  { upTo: 3_299_000, rate: 0.1, deduction: 97_500 },
  { upTo: 6_949_000, rate: 0.2, deduction: 427_500 },
  { upTo: 8_999_000, rate: 0.23, deduction: 636_000 },
  { upTo: 17_999_000, rate: 0.33, deduction: 1_536_000 },
  { upTo: 39_999_000, rate: 0.4, deduction: 2_796_000 },
  { upTo: null, rate: 0.45, deduction: 4_796_000 },
]

/** 復興特別所得税率（基準所得税額×2.1%）。令和19年まで。出典: 国税庁 復興特別所得税のあらまし */
export const RECONSTRUCTION_SURTAX_RATE = 0.021

// ─────────────────────────────────────────────────────────────
// 基礎控除
// 所得税: 令和7・8年分の時限上乗せを含む（出典: 国税庁 No.1199 / 令和7改正専用ページ
//   https://www.nta.go.jp/users/gensen/2025kiso/index.htm）
// 住民税: 令和8年度。最大43万円（据え置き。出典: 横浜市/丹波篠山市公式）
// 合計所得金額の上限 upTo（円, 以下）で控除額 amount を引く。
// ─────────────────────────────────────────────────────────────
export interface AmountByIncomeBand {
  /** 合計所得金額の上限（円, この値以下）。null は上限なし。 */
  readonly upTo: number | null
  readonly amount: number
}

export const BASIC_DEDUCTION_INCOME_TAX_2025: readonly AmountByIncomeBand[] = [
  { upTo: 1_320_000, amount: 950_000 }, // 〜132万: 58万+37万（恒久＋時限の最大）
  { upTo: 3_360_000, amount: 880_000 }, // 〜336万: 58万+30万【令和7・8年分限定】
  { upTo: 4_890_000, amount: 680_000 }, // 〜489万: 58万+10万【令和7・8年分限定】
  { upTo: 6_550_000, amount: 630_000 }, // 〜655万: 58万+5万【令和7・8年分限定】
  { upTo: 23_500_000, amount: 580_000 }, // 〜2350万: 58万（本則・恒久）
  { upTo: 24_000_000, amount: 480_000 },
  { upTo: 24_500_000, amount: 320_000 },
  { upTo: 25_000_000, amount: 160_000 },
  { upTo: null, amount: 0 }, // 2500万超: 適用なし
]

export const BASIC_DEDUCTION_RESIDENT_TAX_2025: readonly AmountByIncomeBand[] = [
  { upTo: 24_000_000, amount: 430_000 },
  { upTo: 24_500_000, amount: 290_000 },
  { upTo: 25_000_000, amount: 150_000 },
  { upTo: null, amount: 0 },
]

// ─────────────────────────────────────────────────────────────
// 配偶者控除・配偶者特別控除
// 本人の合計所得金額のティア（900万/950万/1000万以下）ごとに控除額が変わる。
// 出典: 国税庁 No.1191 / No.1195（所得税）、横浜市・昭島市公式（住民税・令和8年度）
// ─────────────────────────────────────────────────────────────

/** 本人の合計所得金額ティアの上限（円, 以下）。これを超えると配偶者(特別)控除なし。 */
export const SPOUSE_OWNER_INCOME_TIERS: readonly number[] = [9_000_000, 9_500_000, 10_000_000]

/** 配偶者の合計所得金額の判定境界。58万円以下＝配偶者控除、58万円超133万円以下＝配偶者特別控除。 */
export const SPOUSE_DEDUCTION_INCOME_LIMIT = 580_000
export const SPOUSE_SPECIAL_DEDUCTION_INCOME_LIMIT = 1_330_000

/** 配偶者控除額。tiers は SPOUSE_OWNER_INCOME_TIERS と同順（≤900万 / ≤950万 / ≤1000万）。 */
export interface SpouseDeductionTable {
  /** 一般の控除対象配偶者（70歳未満）。 */
  readonly general: readonly number[]
  /** 老人控除対象配偶者（70歳以上）。 */
  readonly elderly: readonly number[]
}

export const SPOUSE_DEDUCTION_2025: { incomeTax: SpouseDeductionTable; residentTax: SpouseDeductionTable } = {
  incomeTax: {
    general: [380_000, 260_000, 130_000],
    elderly: [480_000, 320_000, 160_000],
  },
  residentTax: {
    general: [330_000, 220_000, 110_000],
    elderly: [380_000, 260_000, 130_000],
  },
}

/** 配偶者特別控除。配偶者の合計所得の上限 upTo（以下）ごとに、本人ティア順 [≤900万,≤950万,≤1000万] の控除額。 */
export interface SpouseSpecialBand {
  readonly upTo: number
  readonly amounts: readonly [number, number, number]
}

export const SPOUSE_SPECIAL_DEDUCTION_2025: {
  incomeTax: readonly SpouseSpecialBand[]
  residentTax: readonly SpouseSpecialBand[]
} = {
  // 出典: 国税庁 No.1195
  incomeTax: [
    { upTo: 950_000, amounts: [380_000, 260_000, 130_000] }, // 58万超95万
    { upTo: 1_000_000, amounts: [360_000, 240_000, 120_000] }, // 95万超100万
    { upTo: 1_050_000, amounts: [310_000, 210_000, 110_000] },
    { upTo: 1_100_000, amounts: [260_000, 180_000, 90_000] },
    { upTo: 1_150_000, amounts: [210_000, 140_000, 70_000] },
    { upTo: 1_200_000, amounts: [160_000, 110_000, 60_000] },
    { upTo: 1_250_000, amounts: [110_000, 80_000, 40_000] },
    { upTo: 1_300_000, amounts: [60_000, 40_000, 20_000] },
    { upTo: 1_330_000, amounts: [30_000, 20_000, 10_000] },
  ],
  // 住民税は58万超95万と95万超100万が同額33万なので「58万超100万以下=33万」に統合（出典: 昭島市・横浜市 令和8年度）
  residentTax: [
    { upTo: 1_000_000, amounts: [330_000, 220_000, 110_000] }, // 58万超100万
    { upTo: 1_050_000, amounts: [310_000, 210_000, 110_000] },
    { upTo: 1_100_000, amounts: [260_000, 180_000, 90_000] },
    { upTo: 1_150_000, amounts: [210_000, 140_000, 70_000] },
    { upTo: 1_200_000, amounts: [160_000, 110_000, 60_000] },
    { upTo: 1_250_000, amounts: [110_000, 80_000, 40_000] },
    { upTo: 1_300_000, amounts: [60_000, 40_000, 20_000] },
    { upTo: 1_330_000, amounts: [30_000, 20_000, 10_000] },
  ],
}

// ─────────────────────────────────────────────────────────────
// 扶養控除（出典: 国税庁 No.1180、福岡市公式・令和8年度住民税）
// ─────────────────────────────────────────────────────────────
export interface DependentDeductionTable {
  /** 一般の控除対象扶養親族（16〜18・23〜69歳）。 */
  readonly general: number
  /** 特定扶養親族（19〜22歳）。 */
  readonly specified: number
  /** 老人扶養親族・同居老親等。 */
  readonly elderlyCoLiving: number
  /** 老人扶養親族・同居老親等以外。 */
  readonly elderlyOther: number
}

export const DEPENDENT_DEDUCTION_2025: { incomeTax: DependentDeductionTable; residentTax: DependentDeductionTable } = {
  incomeTax: { general: 380_000, specified: 630_000, elderlyCoLiving: 580_000, elderlyOther: 480_000 },
  residentTax: { general: 330_000, specified: 450_000, elderlyCoLiving: 450_000, elderlyOther: 380_000 },
}

// ─────────────────────────────────────────────────────────────
// 特定親族特別控除（令和7年新設。19〜22歳・合計所得58万超123万以下）
// 出典: 国税庁 No.1177、町田市公式（住民税・令和8年度）
// 親族の合計所得金額の上限 upTo（以下）で控除額を引く。
// ─────────────────────────────────────────────────────────────
export const SPECIAL_RELATIVE_DEDUCTION_2025: {
  incomeTax: readonly AmountByIncomeBand[]
  residentTax: readonly AmountByIncomeBand[]
} = {
  incomeTax: [
    { upTo: 850_000, amount: 630_000 },
    { upTo: 900_000, amount: 610_000 },
    { upTo: 950_000, amount: 510_000 },
    { upTo: 1_000_000, amount: 410_000 },
    { upTo: 1_050_000, amount: 310_000 },
    { upTo: 1_100_000, amount: 210_000 },
    { upTo: 1_150_000, amount: 110_000 },
    { upTo: 1_200_000, amount: 60_000 },
    { upTo: 1_230_000, amount: 30_000 },
    { upTo: null, amount: 0 },
  ],
  residentTax: [
    { upTo: 850_000, amount: 450_000 },
    { upTo: 900_000, amount: 450_000 },
    { upTo: 950_000, amount: 450_000 },
    { upTo: 1_000_000, amount: 410_000 },
    { upTo: 1_050_000, amount: 310_000 },
    { upTo: 1_100_000, amount: 210_000 },
    { upTo: 1_150_000, amount: 110_000 },
    { upTo: 1_200_000, amount: 60_000 },
    { upTo: 1_230_000, amount: 30_000 },
    { upTo: null, amount: 0 },
  ],
}

// ─────────────────────────────────────────────────────────────
// 個人住民税（令和7年度／令和8年度）標準
// 出典: 総務省 個人住民税 150790_06.html、東京都主税局、森林環境税 150790_18.html
// ─────────────────────────────────────────────────────────────
export const RESIDENT_TAX_2025 = {
  /** 所得割の標準税率。市町村6% + 道府県4% = 10%。 */
  incomeRate: { city: 0.06, prefecture: 0.04, total: 0.1 },
  /** 均等割の標準額（円）。 */
  perCapita: { city: 3_000, prefecture: 1_000, total: 4_000 },
  /** 森林環境税（国税・均等割と併徴、令和6年度〜）。 */
  forestTax: 1_000,
  /** 調整控除：合計課税所得200万円以下/超で算式が変わる。5%（市3%:道府県2%）。 */
  adjustment: {
    threshold: 2_000_000,
    rate: 0.05,
    /** 200万円超の場合の最低控除額（円）。 */
    minimumOverThreshold: 2_500,
    /** 合計所得金額がこの額を超えると調整控除なし（令和3年度〜）。 */
    incomeCap: 25_000_000,
  },
} as const

/**
 * 調整控除で用いる「人的控除額の差」（所得税の控除額 − 住民税の控除額の法定差額）。
 * 注: 主要な人的控除のみ。本人合計所得900万円超のティアや配偶者特別控除の所得帯による差は
 * 当面この基準値で近似する（sources-2025.md の openQuestions 参照）。
 * 出典: 各自治体の「人的控除の差と調整控除」（例: 諏訪市）。
 */
export const HUMAN_DEDUCTION_DIFF_2025 = {
  basic: 50_000,
  spouseGeneral: 50_000,
  spouseElderly: 100_000,
  /** 配偶者特別控除（配偶者の合計所得が一定以下の主帯）。 */
  spouseSpecial: 50_000,
  dependentGeneral: 50_000,
  dependentSpecified: 180_000,
  dependentElderlyOther: 100_000,
  dependentCoLiving: 130_000,
} as const

// ─────────────────────────────────────────────────────────────
// 社会保険料（協会けんぽ 東京都・令和7年度／厚生年金／雇用保険）
// 出典: 協会けんぽ r07 保険料率、日本年金機構 厚生年金保険料額表、厚労省 雇用保険料率(R7)
// 標準報酬月額は MVP では月額(年収/12)を用い、下限・上限のみ正確にクランプする近似
// （正確な等級表は別タスクで取り込み予定。sources-2025.md 参照）。
// ─────────────────────────────────────────────────────────────
export const SOCIAL_INSURANCE_2025 = {
  /** 健康保険（東京都・協会けんぽ）。料率は労使合計、本人負担は折半。 */
  health: { rate: 0.0991, standardFloor: 58_000, standardCap: 1_390_000 },
  /** 介護保険（第2号・40〜64歳・全国一律）。健保に上乗せ。 */
  longTermCare: { rate: 0.0159, minAge: 40, maxAge: 64 },
  /** 厚生年金（全国一律18.3%固定）。標準報酬月額の上下限。 */
  pension: { rate: 0.183, standardFloor: 88_000, standardCap: 650_000 },
  /** 雇用保険（一般の事業・令和7年度）。本人負担は賃金総額×5.5/1000。 */
  employment: { employeeRate: 0.0055 },
} as const
