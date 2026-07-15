/**
 * 令和7年（2025）税率・控除データ。
 *
 * 出典の詳細・年度対応・採用した近似は data/taxTables/sources-2025.md を参照。
 * 原則として「所得税＝令和7年分」「個人住民税＝令和8年度（令和7年所得）」で統一。
 * すべて円単位。各数値の一次情報は行コメントの URL を参照。
 */
import type {
  ChildcareLeaveBenefitConfig,
  EarthquakeInsuranceConfig,
  HousingLoanConfig,
  LifeInsuranceConfig,
  MedicalExpenseConfig,
  NationalHealthInsuranceConfig,
  NationalPensionConfig,
  PersonalDeductionConfig,
  PublicPensionDeductionConfig,
  TaxTable,
} from './types'

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

/**
 * 復興特別所得税率（基準所得税額×2.1%）。全年度で共有する定数。
 * 令和8年分まで復興特別所得税2.1%。令和9年分以後は復興特別所得税1.1%（課税期間を令和19年→**令和29年12月31日**まで
 * 10年延長）＋防衛特別所得税1.0%の合算2.1%で負担は不変のため、率は 0.021 のまま（内訳の変化のみ。2027.ts の注記参照）。
 * 出典: 国税庁「防衛特別所得税及び復興特別所得税の源泉徴収のあらまし（令和9年1月以後の源泉徴収）」
 *   https://www.nta.go.jp/publication/pamph/pdf/0026005-024_02.pdf 、財務省 令和8年度税制改正の大綱
 *   https://www.mof.go.jp/tax_policy/tax_reform/outline/fy2026/08taikou_06.htm 。
 */
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
// 公的年金等控除（公的年金等に係る雑所得の速算表・令和2年分以後）
// 出典: 国税庁 No.1600 公的年金等の課税関係
//   https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1600.htm
// 雑所得 = max(0, 収入金額 × rate − deduction)。65歳到達（12/31時点）で控除額が拡大する。
// 本アプリは「公的年金等以外の合計所得金額1,000万円以下」の区分のみ実装する（控除対象配偶者は
// 年金以外の所得1,000万円超では対象外のため十分。速算表は令和2年分以後不変＝令和7以降も同じ）。
// upTo は各割合区分の収入上限。区分境界では両式の値が一致するため upTo は丸め値でよい。
// ─────────────────────────────────────────────────────────────
export interface PublicPensionBand {
  /** 公的年金等の収入金額の上限（円）。null は上限なし。 */
  readonly upTo: number | null
  /** 収入金額に乗じる割合。 */
  readonly rate: number
  /** 差し引く控除額（円）。 */
  readonly deduction: number
}

export const PUBLIC_PENSION_DEDUCTION_2025: PublicPensionDeductionConfig = {
  // 65歳未満: 収入60万円以下は雑所得0（130万未満まで控除60万相当）。
  under65: [
    { upTo: 1_300_000, rate: 1, deduction: 600_000 },
    { upTo: 4_100_000, rate: 0.75, deduction: 275_000 },
    { upTo: 7_700_000, rate: 0.85, deduction: 685_000 },
    { upTo: 10_000_000, rate: 0.95, deduction: 1_455_000 },
    { upTo: null, rate: 1, deduction: 1_955_000 },
  ],
  // 65歳以上: 収入110万円以下は雑所得0（330万未満まで控除110万相当）。
  from65: [
    { upTo: 3_300_000, rate: 1, deduction: 1_100_000 },
    { upTo: 4_100_000, rate: 0.75, deduction: 275_000 },
    { upTo: 7_700_000, rate: 0.85, deduction: 685_000 },
    { upTo: 10_000_000, rate: 0.95, deduction: 1_455_000 },
    { upTo: null, rate: 1, deduction: 1_955_000 },
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
 * 個人住民税の非課税限度額（1級地・標準。東京23区等）。
 * 均等割: 合計所得 ≤ 35万×人数 + 10万 (+扶養等あれば21万)
 * 所得割: 総所得 ≤ 35万×人数 + 10万 (+扶養等あれば32万)
 * 人数＝本人＋同一生計配偶者＋扶養親族。出典: 総務省 個人住民税（非課税限度額）149767_03.html。
 * 注: 35万・加算は級地区分(2級地0.9/3級地0.8)で補正されるが当面1級地で固定。
 */
export const RESIDENT_TAX_NON_TAXABLE_2025 = {
  perPerson: 350_000,
  base: 100_000,
  /** 均等割: 同一生計配偶者・扶養親族がいる場合の加算。 */
  perCapitaAddition: 210_000,
  /** 所得割: 同一生計配偶者・扶養親族がいる場合の加算。 */
  incomePortionAddition: 320_000,
  /**
   * 障害者・未成年者・寡婦・ひとり親の非課税限度額（合計所得135万円以下・級地率なし）。
   * 給与収入のみなら約204.4万円に相当。出典: 地方税法295条第1項第2号、東京都主税局。
   */
  personalNonTaxable: 1_350_000,
} as const

// ─────────────────────────────────────────────────────────────
// 本人の属性による所得控除（障害者・ひとり親・寡婦・勤労学生）
// 出典: 国税庁 No.1160（障害者控除）・No.1170（寡婦控除）・No.1171（ひとり親控除）・
//   No.1175（勤労学生控除）、地方税法295条、東京都主税局。
// 控除額（円, 所得税/住民税）: 障害者 普通27万/26万・特別40万/30万・同居特別75万/53万、
//   ひとり親35万/30万、寡婦27万/26万、勤労学生27万/26万。
// 同居特別障害者は同一生計配偶者・扶養親族が特別障害者かつ同居の場合（本人には適用なし）。
// 所得要件: ひとり親・寡婦は合計所得500万円以下、勤労学生は合計所得75万円以下。
//   （勤労学生の「勤労以外の所得10万円以下」要件は本アプリでは近似で省略。）
// ─────────────────────────────────────────────────────────────
export const PERSONAL_DEDUCTION_2025: PersonalDeductionConfig = {
  disabilityNormal: { incomeTax: 270_000, residentTax: 260_000 },
  disabilitySpecial: { incomeTax: 400_000, residentTax: 300_000 },
  disabilityCoLivingSpecial: { incomeTax: 750_000, residentTax: 530_000 },
  singleParent: { incomeTax: 350_000, residentTax: 300_000 },
  widow: { incomeTax: 270_000, residentTax: 260_000 },
  workingStudent: { incomeTax: 270_000, residentTax: 260_000 },
  singleParentWidowIncomeLimit: 5_000_000,
  workingStudentIncomeLimit: 750_000,
}

/**
 * 調整控除で用いる「人的控除額の差」（所得税の控除額 − 住民税の控除額の法定差額）。
 * 注: 主要な人的控除のみ。本人合計所得900万円超のティアや配偶者特別控除の所得帯による差は
 * 当面この基準値で近似する（sources-2025.md の openQuestions 参照）。
 * 障害者・寡婦・勤労学生の差は控除額の差そのもの（障害者普通1万/特別10万/同居特別22万、寡婦・勤労学生1万）。
 * ひとり親は母5万（35万−30万）を用いる。ひとり親（父）の法定差額は1万だが、本アプリは父母を
 * 区別しないため5万で近似する（該当は母が大多数・差額は最大4万円）。
 * 出典: 東京都主税局「人的控除の差と調整控除」・各自治体（例: 諏訪市）。
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
  /** 障害者控除（普通）: 27万−26万。 */
  disabilityNormal: 10_000,
  /** 特別障害者控除: 40万−30万。 */
  disabilitySpecial: 100_000,
  /** 同居特別障害者控除: 75万−53万。 */
  disabilityCoLivingSpecial: 220_000,
  /** ひとり親控除: 母35万−30万（父は法定1万だが5万で近似）。 */
  singleParent: 50_000,
  /** 寡婦控除: 27万−26万。 */
  widow: 10_000,
  /** 勤労学生控除: 27万−26万。 */
  workingStudent: 10_000,
} as const

// ─────────────────────────────────────────────────────────────
// 社会保険料（協会けんぽ 東京都・令和7年度／厚生年金／雇用保険）
// 出典: 協会けんぽ 令和7年度保険料額表(東京都)、日本年金機構 厚生年金保険料額表、厚労省 雇用保険料率(R7)
// ─────────────────────────────────────────────────────────────
export const SOCIAL_INSURANCE_2025 = {
  /** 健康保険（東京都・協会けんぽ）。料率は労使合計、本人負担は折半。 */
  health: { rate: 0.0991 },
  /** 介護保険（第2号・40〜64歳・全国一律）。健保に上乗せ。 */
  longTermCare: { rate: 0.0159, minAge: 40, maxAge: 64 },
  /** 厚生年金（全国一律18.3%固定）。maxAge＝70歳到達で資格喪失（70歳以上は保険料なし）。 */
  pension: { rate: 0.183, maxAge: 70 },
  /** 雇用保険（一般の事業・令和7年度）。本人負担は賃金総額×5.5/1000。年齢上限なし。 */
  employment: { employeeRate: 0.0055 },
  /** 75歳で後期高齢者医療制度へ移行（健保の給与天引きなし・別途個人負担）。 */
  latterStageElderlyAge: 75,
} as const

/** 標準報酬月額の等級。standard＝標準報酬月額、lower＝この等級が適用される報酬月額の下限（円, 以上。最下級は0）。 */
export interface StandardRemunerationGrade {
  readonly standard: number
  readonly lower: number
}

/**
 * 健康保険 標準報酬月額 等級表（全50等級）。出典: 協会けんぽ 令和7年度保険料額表。
 * 報酬月額が lower 以上で次の等級未満のとき standard を標準報酬月額とする。
 */
export const HEALTH_GRADES_2025: readonly StandardRemunerationGrade[] = [
  { standard: 58_000, lower: 0 },
  { standard: 68_000, lower: 63_000 },
  { standard: 78_000, lower: 73_000 },
  { standard: 88_000, lower: 83_000 },
  { standard: 98_000, lower: 93_000 },
  { standard: 104_000, lower: 101_000 },
  { standard: 110_000, lower: 107_000 },
  { standard: 118_000, lower: 114_000 },
  { standard: 126_000, lower: 122_000 },
  { standard: 134_000, lower: 130_000 },
  { standard: 142_000, lower: 138_000 },
  { standard: 150_000, lower: 146_000 },
  { standard: 160_000, lower: 155_000 },
  { standard: 170_000, lower: 165_000 },
  { standard: 180_000, lower: 175_000 },
  { standard: 190_000, lower: 185_000 },
  { standard: 200_000, lower: 195_000 },
  { standard: 220_000, lower: 210_000 },
  { standard: 240_000, lower: 230_000 },
  { standard: 260_000, lower: 250_000 },
  { standard: 280_000, lower: 270_000 },
  { standard: 300_000, lower: 290_000 },
  { standard: 320_000, lower: 310_000 },
  { standard: 340_000, lower: 330_000 },
  { standard: 360_000, lower: 350_000 },
  { standard: 380_000, lower: 370_000 },
  { standard: 410_000, lower: 395_000 },
  { standard: 440_000, lower: 425_000 },
  { standard: 470_000, lower: 455_000 },
  { standard: 500_000, lower: 485_000 },
  { standard: 530_000, lower: 515_000 },
  { standard: 560_000, lower: 545_000 },
  { standard: 590_000, lower: 575_000 },
  { standard: 620_000, lower: 605_000 },
  { standard: 650_000, lower: 635_000 },
  { standard: 680_000, lower: 665_000 },
  { standard: 710_000, lower: 695_000 },
  { standard: 750_000, lower: 730_000 },
  { standard: 790_000, lower: 770_000 },
  { standard: 830_000, lower: 810_000 },
  { standard: 880_000, lower: 855_000 },
  { standard: 930_000, lower: 905_000 },
  { standard: 980_000, lower: 955_000 },
  { standard: 1_030_000, lower: 1_005_000 },
  { standard: 1_090_000, lower: 1_055_000 },
  { standard: 1_150_000, lower: 1_115_000 },
  { standard: 1_210_000, lower: 1_175_000 },
  { standard: 1_270_000, lower: 1_235_000 },
  { standard: 1_330_000, lower: 1_295_000 },
  { standard: 1_390_000, lower: 1_355_000 },
]

/**
 * 厚生年金 標準報酬月額 等級表（全32等級）。出典: 日本年金機構 厚生年金保険料額表。
 * 下限88,000円・上限650,000円。
 */
export const PENSION_GRADES_2025: readonly StandardRemunerationGrade[] = [
  { standard: 88_000, lower: 0 },
  { standard: 98_000, lower: 93_000 },
  { standard: 104_000, lower: 101_000 },
  { standard: 110_000, lower: 107_000 },
  { standard: 118_000, lower: 114_000 },
  { standard: 126_000, lower: 122_000 },
  { standard: 134_000, lower: 130_000 },
  { standard: 142_000, lower: 138_000 },
  { standard: 150_000, lower: 146_000 },
  { standard: 160_000, lower: 155_000 },
  { standard: 170_000, lower: 165_000 },
  { standard: 180_000, lower: 175_000 },
  { standard: 190_000, lower: 185_000 },
  { standard: 200_000, lower: 195_000 },
  { standard: 220_000, lower: 210_000 },
  { standard: 240_000, lower: 230_000 },
  { standard: 260_000, lower: 250_000 },
  { standard: 280_000, lower: 270_000 },
  { standard: 300_000, lower: 290_000 },
  { standard: 320_000, lower: 310_000 },
  { standard: 340_000, lower: 330_000 },
  { standard: 360_000, lower: 350_000 },
  { standard: 380_000, lower: 370_000 },
  { standard: 410_000, lower: 395_000 },
  { standard: 440_000, lower: 425_000 },
  { standard: 470_000, lower: 455_000 },
  { standard: 500_000, lower: 485_000 },
  { standard: 530_000, lower: 515_000 },
  { standard: 560_000, lower: 545_000 },
  { standard: 590_000, lower: 575_000 },
  { standard: 620_000, lower: 605_000 },
  { standard: 650_000, lower: 635_000 },
]

// ─────────────────────────────────────────────────────────────
// 医療費控除（出典: 国税庁 No.1120／セルフメディケーション No.1129）
// 控除額 = max(0,(支払医療費−保険金等)−min(10万, 総所得金額等×5%))、上限200万。
// 所得税・住民税で同額。
// ─────────────────────────────────────────────────────────────
export const MEDICAL_EXPENSE_2025: MedicalExpenseConfig = {
  floorAmount: 100_000,
  floorRate: 0.05,
  cap: 2_000_000,
  selfMedication: { floor: 12_000, cap: 88_000 }, // 1.2万超〜上限8.8万
}

// ─────────────────────────────────────────────────────────────
// 生命保険料控除（出典: 国税庁 No.1140、自治体公式（住民税））
// 区分=一般/介護医療(新のみ)/個人年金。段階式 deduction = 支払×rate + plus。
// 新制度: 区分上限 所得税4万/住民税2.8万。旧制度: 所得税5万/住民税3.5万。
// 合計上限 所得税12万/住民税7万。新旧併用は区分上限(新)で頭打ち、有利選択。
// ─────────────────────────────────────────────────────────────
export const LIFE_INSURANCE_2025: LifeInsuranceConfig = {
  newRegime: {
    incomeTax: [
      { upTo: 20_000, rate: 1, plus: 0 },
      { upTo: 40_000, rate: 0.5, plus: 10_000 },
      { upTo: 80_000, rate: 0.25, plus: 20_000 },
      { upTo: null, rate: 0, plus: 40_000 },
    ],
    residentTax: [
      { upTo: 12_000, rate: 1, plus: 0 },
      { upTo: 32_000, rate: 0.5, plus: 6_000 },
      { upTo: 56_000, rate: 0.25, plus: 14_000 },
      { upTo: null, rate: 0, plus: 28_000 },
    ],
  },
  oldRegime: {
    incomeTax: [
      { upTo: 25_000, rate: 1, plus: 0 },
      { upTo: 50_000, rate: 0.5, plus: 12_500 },
      { upTo: 100_000, rate: 0.25, plus: 25_000 },
      { upTo: null, rate: 0, plus: 50_000 },
    ],
    residentTax: [
      { upTo: 15_000, rate: 1, plus: 0 },
      { upTo: 40_000, rate: 0.5, plus: 7_500 },
      { upTo: 70_000, rate: 0.25, plus: 17_500 },
      { upTo: null, rate: 0, plus: 35_000 },
    ],
  },
  combinedCategoryCap: { incomeTax: 40_000, residentTax: 28_000 },
  totalCap: { incomeTax: 120_000, residentTax: 70_000 },
}

// ─────────────────────────────────────────────────────────────
// 地震保険料控除（出典: 国税庁 No.1145、自治体公式（住民税））
// 所得税: 地震保険料は全額(上限5万)。旧長期損害保険料は段階。合算上限5万。
// 住民税: 地震保険料は1/2(上限2.5万)。旧長期は段階。合算上限2.5万。
// ─────────────────────────────────────────────────────────────
export const EARTHQUAKE_INSURANCE_2025: EarthquakeInsuranceConfig = {
  incomeTax: {
    earthquake: { rate: 1, cap: 50_000 },
    oldLongTerm: [
      { upTo: 10_000, rate: 1, plus: 0 },
      { upTo: 20_000, rate: 0.5, plus: 5_000 },
      { upTo: null, rate: 0, plus: 15_000 },
    ],
    totalCap: 50_000,
  },
  residentTax: {
    earthquake: { rate: 0.5, cap: 25_000 },
    oldLongTerm: [
      { upTo: 5_000, rate: 1, plus: 0 },
      { upTo: 15_000, rate: 0.5, plus: 2_500 },
      { upTo: null, rate: 0, plus: 10_000 },
    ],
    totalCap: 25_000,
  },
}

// ─────────────────────────────────────────────────────────────
// 住宅借入金等特別控除（住宅ローン控除）令和4〜7入居の現行制度（控除率0.7%）
// 出典: 国税庁 No.1211-1（新築）/No.1211-3（中古）、国交省 住宅ローン減税。
// 控除額 = min(年末残高, 借入限度額) × 0.7%。所得税で引ききれない分は住民税所得割から
//   （前年課税総所得×5%・上限97,500円）。借入限度額は 入居年×新築/中古×住宅性能。
// 子育て・若者夫婦世帯は令和6・7新築のみ上乗せ。新築その他は令和6・7は原則対象外(0)。
// ─────────────────────────────────────────────────────────────
export const HOUSING_LOAN_2025: HousingLoanConfig = {
  creditRate: 0.007,
  incomeLimit: 20_000_000,
  residentCarryover: { rate: 0.05, cap: 97_500 },
  period: { new: 13, used: 10 },
  limits: {
    new: {
      2022: { certified: 50_000_000, zeh: 45_000_000, energySaving: 40_000_000, other: 30_000_000 },
      2023: { certified: 50_000_000, zeh: 45_000_000, energySaving: 40_000_000, other: 30_000_000 },
      2024: { certified: 45_000_000, zeh: 35_000_000, energySaving: 30_000_000, other: 0 },
      2025: { certified: 45_000_000, zeh: 35_000_000, energySaving: 30_000_000, other: 0 },
    },
    newChildcare: {
      2024: { certified: 50_000_000, zeh: 45_000_000, energySaving: 40_000_000, other: 0 },
      2025: { certified: 50_000_000, zeh: 45_000_000, energySaving: 40_000_000, other: 0 },
    },
    used: { certified: 30_000_000, zeh: 30_000_000, energySaving: 30_000_000, other: 20_000_000 },
  },
}

// ─────────────────────────────────────────────────────────────
// 個人事業主モード：国民年金（令和7年度・定額）／国民健康保険（東京特別区・令和7年度・概算）
// 出典: 日本年金機構（月額17,510円）、新宿区/文京区/東京都保健医療局（特別区統一保険料率）。
// 国保の賦課基準額＝総所得金額等−43万円（旧ただし書き所得）。
// ─────────────────────────────────────────────────────────────
export const NATIONAL_PENSION_2025: NationalPensionConfig = { annual: 210_120 } // 17,510円×12

export const NATIONAL_HEALTH_INSURANCE_2025: NationalHealthInsuranceConfig = {
  basicDeduction: 430_000,
  medical: { incomeRate: 0.0771, perCapita: 47_300, cap: 660_000 },
  support: { incomeRate: 0.0269, perCapita: 16_800, cap: 260_000 },
  longTermCare: { incomeRate: 0.0225, perCapita: 16_600, cap: 170_000, minAge: 40, maxAge: 64 },
  areaLabel: '東京都特別区',
}

// 育児休業給付（雇用保険）。180日まで67%・181日〜50%、賃金日額上限16,110円（令和7.8〜令和8.7）、
// 出生後休業支援給付金13%・最大28日（令和7.4新設）。いずれも非課税・社保算定対象外。
// 出典: 厚労省「育児休業等給付について」、ハローワーク。
export const CHILDCARE_LEAVE_BENEFIT_2025: ChildcareLeaveBenefitConfig = {
  earlyRate: 0.67,
  lateRate: 0.5,
  earlyDays: 180,
  dailyWageCap: 16_110,
  postBirthRate: 0.13,
  postBirthMaxDays: 28,
}

// ─────────────────────────────────────────────────────────────
// 集約: 令和7年（2025）の TaxTable。レジストリ（index.ts）から参照する。
// 上の個別定数は出典コメント保持のためそのまま残し、ここで束ねる。
// ─────────────────────────────────────────────────────────────
export const TAX_TABLE_2025: TaxTable = {
  year: TAX_YEAR_2025,
  employmentIncomeDeduction: EMPLOYMENT_INCOME_DEDUCTION_2025,
  incomeTaxBrackets: INCOME_TAX_BRACKETS_2025,
  reconstructionSurtaxRate: RECONSTRUCTION_SURTAX_RATE,
  basicDeduction: {
    incomeTax: BASIC_DEDUCTION_INCOME_TAX_2025,
    residentTax: BASIC_DEDUCTION_RESIDENT_TAX_2025,
  },
  ownerIncomeTiers: SPOUSE_OWNER_INCOME_TIERS,
  spouseDeductionIncomeLimit: SPOUSE_DEDUCTION_INCOME_LIMIT,
  spouseSpecialDeductionIncomeLimit: SPOUSE_SPECIAL_DEDUCTION_INCOME_LIMIT,
  spouseDeduction: SPOUSE_DEDUCTION_2025,
  spouseSpecialDeduction: SPOUSE_SPECIAL_DEDUCTION_2025,
  dependentDeduction: DEPENDENT_DEDUCTION_2025,
  specialRelativeDeduction: SPECIAL_RELATIVE_DEDUCTION_2025,
  publicPensionDeduction: PUBLIC_PENSION_DEDUCTION_2025,
  residentTax: RESIDENT_TAX_2025,
  residentTaxNonTaxable: RESIDENT_TAX_NON_TAXABLE_2025,
  personalDeduction: PERSONAL_DEDUCTION_2025,
  humanDeductionDiff: HUMAN_DEDUCTION_DIFF_2025,
  socialInsurance: SOCIAL_INSURANCE_2025,
  healthGrades: HEALTH_GRADES_2025,
  pensionGrades: PENSION_GRADES_2025,
  medicalExpense: MEDICAL_EXPENSE_2025,
  lifeInsurance: LIFE_INSURANCE_2025,
  earthquakeInsurance: EARTHQUAKE_INSURANCE_2025,
  housingLoan: HOUSING_LOAN_2025,
  nationalPension: NATIONAL_PENSION_2025,
  nationalHealthInsurance: NATIONAL_HEALTH_INSURANCE_2025,
  childcareLeaveBenefit: CHILDCARE_LEAVE_BENEFIT_2025,
}
