import { useMemo, useState } from 'react'
import { calculateTakeHome, computeSettlement, furusatoFromResult, furusatoActual, getTaxTable } from '@core/index'
import type { SettlementResult } from '@core/index'
import { defaultForm, switchToActual, toInput, type FormState } from './state'
import { eraLabel, yen, perMonth } from './format'
import { InputForm } from './components/InputForm'
import { ExtraDeductionsForm } from './components/ExtraDeductionsForm'
import { ResultView } from './components/ResultView'
import { SettlementCard } from './components/SettlementCard'
import { FurusatoView } from './components/FurusatoView'

export function App() {
  const [form, setForm] = useState<FormState>(defaultForm)
  const onChange = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  const result = useMemo(() => calculateTakeHome(toInput(form)), [form])
  const furusato = useMemo(() => furusatoFromResult(result, getTaxTable(form.taxYear)), [result, form.taxYear])
  const furusatoActualResult = useMemo(
    () => furusatoActual(result, form.furusatoDonation, getTaxTable(form.taxYear)),
    [result, form.furusatoDonation, form.taxYear],
  )

  // 個人事業主は確定申告必須のためワンストップ特例を使えない（FurusatoView と同じ実効方式）。
  const soleMode = form.mode === 'soleProprietor'
  const isOneStop = form.furusatoMethod === 'oneStop' && !soleMode
  const hasDonation = form.furusatoDonation > 0
  // 確定申告方式かつ寄附ありのときだけ、ふるさと納税の所得税還付分を年税額から差し引いて精算する。
  const furusatoFilingCredit = !isOneStop && hasDonation ? furusatoActualResult.incomeTaxCredit : undefined
  // 実額タブ（給与所得者）で源泉徴収税額を入力（0 も可・null は未入力）したときだけ精算結果を出す。
  // 源泉徴収税額欄は給与所得者のみのため、個人事業主では出さない（給与所得者で入力後にモード切替しても残さない）。
  const settlement = useMemo<SettlementResult | null>(() => {
    if (form.inputMode !== 'actual' || soleMode || form.actualWithholding === null) return null
    return computeSettlement({
      annualTax: result.incomeTax,
      withheld: form.actualWithholding,
      furusatoIncomeTaxCredit: furusatoFilingCredit,
    })
  }, [form.inputMode, soleMode, form.actualWithholding, result.incomeTax, furusatoFilingCredit])

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">tezukai</h1>
        <p className="app__subtitle">手取り税金シミュレータ（{eraLabel(result.taxYear)}・概算）</p>
      </header>

      {/* 計算モードの切替（ネイティブ radio のセグメントコントロール。header 直下・暫定バナーより上）。 */}
      <div className="inputmode" role="radiogroup" aria-label="計算モード">
        <label className={`inputmode__option ${form.inputMode === 'estimate' ? 'inputmode__option--active' : ''}`}>
          <input
            type="radio"
            name="input-mode"
            checked={form.inputMode === 'estimate'}
            onChange={() => onChange({ inputMode: 'estimate' })}
          />
          見込みで試算
        </label>
        <label className={`inputmode__option ${form.inputMode === 'actual' ? 'inputmode__option--active' : ''}`}>
          <input
            type="radio"
            name="input-mode"
            checked={form.inputMode === 'actual'}
            onChange={() => onChange(switchToActual(form))}
          />
          実額から計算（源泉徴収票）
        </label>
      </div>

      {getTaxTable(form.taxYear).provisional && (
        // 要約（role=status）と詳しい前提（details）を分離。details はライブリージョン外に置き、
        // 開閉時に読み上げが走らないようにする（role/aria-live は要約の <p> のみに付与）。
        <div className="app__banner">
          <p style={{ margin: 0 }} role="status" aria-live="polite">
            ※ <strong>{eraLabel(form.taxYear)}分は暫定（工事中）</strong>です。所得税は確定済みの令和8年度改正（基礎控除・給与所得控除）を反映していますが、
            社会保険料率などは一部で前後の年度の数値を流用しており、今後の税制改正で内容が変わる可能性があります。
          </p>
          <details style={{ marginTop: '0.5rem' }}>
            <summary style={{ cursor: 'pointer' }}>詳しい前提を見る</summary>
            <p style={{ margin: '0.4rem 0 0' }}>
              令和9年分は<strong>防衛特別所得税1.0%を新設・復興特別所得税を1.1%に引下げ</strong>（合算2.1%で税額は不変）。
              社会保険料率（協会けんぽ・雇用保険・子ども子育て支援金）は<strong>令和8年度を流用</strong>しています（国民年金のみ令和9確定額。
              個人事業主の国民健康保険は令和7年度〔東京特別区〕を流用）。厚生年金の標準報酬月額の上限引上げ（令和9年9月〜68万円）は
              年度途中改定のため未反映で、高所得者の厚生年金保険料を低め（手取りを高め）に概算します。
            </p>
          </details>
        </div>
      )}

      <div className="app__grid">
        {/* 送信のないフォーム（Enter での送信は抑止）。入力領域をフォームランドマークとして明示する。 */}
        <form className="app__col" aria-label="収入と控除の入力" onSubmit={(e) => e.preventDefault()}>
          <InputForm form={form} onChange={onChange} />
          <ExtraDeductionsForm form={form} onChange={onChange} />
        </form>
        <div className="app__col">
          <ResultView result={result} inputMode={form.inputMode} />
          {settlement && (
            <SettlementCard
              settlement={settlement}
              hasOtherIncome={result.otherIncomeTotal !== 0}
              oneStopWithDonation={isOneStop && hasDonation}
            />
          )}
        </div>
      </div>

      <FurusatoView furusato={furusato} actual={furusatoActualResult} form={form} onChange={onChange} />

      <footer className="app__footer">
        <p>
          ※ 本ツールは<strong>概算</strong>です。確定申告書類の作成や個別の税務助言ではありません。
          社会保険料は、給与所得者は協会けんぽ（東京）の等級表（賞与分離も可）、
          個人事業主は国民年金＋国民健康保険（東京特別区の率による概算）で計算します。
          自治体・年度・各種要件で実額は変わります。
        </p>
        <p>
          住民税は<strong>標準税率（均等割は標準額・1級地）</strong>で計算し、自治体ごとの均等割の超過課税・非課税限度額の級地差は反映していません。
          健康保険は協会けんぽ（東京）を既定とし、<strong>組合健保は本人負担の保険料率を手入力</strong>して試算できます（他都道府県の協会けんぽ支部料率の切替は未対応）。
        </p>
        <p>
          すべての計算はブラウザ内で行われ、入力内容が保存・送信されることはありません。
          所得税は{eraLabel(result.taxYear)}分、個人住民税は翌年度（当年所得）の標準的な税率・控除に基づきます。
        </p>
        <p>実額タブの還付・追徴額は確定申告をした場合の目安です。</p>
      </footer>

      {/* モバイル（760px 以下）で結果がフォーム下に沈むため、手取りを画面下部に常時追従表示。
          読み上げ正本は ResultView 側のため aria-hidden の表示専用（フォーカス可能要素は置かない）。 */}
      <MobileResultBar takeHome={result.takeHome} settlement={settlement} />
    </main>
  )
}

/**
 * モバイル用の追従ミニ結果バー（表示専用・aria-hidden）。760px 超では CSS で非表示。
 * 実額タブで源泉徴収税額を入力したときは還付/追徴の目安を主表示に切替（未入力時は年間手取り）。
 */
function MobileResultBar({ takeHome, settlement }: { takeHome: number; settlement: SettlementResult | null }) {
  if (settlement) {
    const { diff } = settlement
    const label = diff < 0 ? '還付見込み' : diff > 0 ? '追加納付' : '過不足なし'
    return (
      <div className="mobile-bar" aria-hidden="true">
        <span className="mobile-bar__label">{label}</span>
        {diff !== 0 && <span className="mobile-bar__value">{yen(Math.abs(diff))}</span>}
      </div>
    )
  }
  return (
    <div className="mobile-bar" aria-hidden="true">
      <span className="mobile-bar__label">年間手取り</span>
      <span className="mobile-bar__value">{yen(takeHome)}</span>
      <span className="mobile-bar__sub">（月あたり {perMonth(takeHome)}）</span>
    </div>
  )
}
