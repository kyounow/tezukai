import { useMemo, useState } from 'react'
import { calculateTakeHome, furusatoFromResult, furusatoActual, getTaxTable } from '@core/index'
import { defaultForm, toInput, type FormState } from './state'
import { eraLabel } from './format'
import { InputForm } from './components/InputForm'
import { ExtraDeductionsForm } from './components/ExtraDeductionsForm'
import { ResultView } from './components/ResultView'
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

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">tezukai</h1>
        <p className="app__subtitle">手取り税金シミュレータ（{eraLabel(result.taxYear)}・概算）</p>
      </header>

      {getTaxTable(form.taxYear).provisional && (
        <div className="app__banner" role="status" aria-live="polite">
          ※ <strong>{eraLabel(form.taxYear)}分は暫定（工事中）</strong>です。所得税は確定済みの令和8年度改正（基礎控除・給与所得控除）を反映していますが、
          今後の税制改正で内容が変わる可能性があります。令和9年分は<strong>防衛特別所得税1.0%を新設・復興特別所得税を1.1%に引下げ</strong>（合算2.1%で税額は不変）。
          社会保険料率（協会けんぽ・雇用保険・子ども子育て支援金）は<strong>令和8年度を流用</strong>しています（国民年金のみ令和9確定額。
          個人事業主の国民健康保険は令和7年度〔東京特別区〕を流用）。厚生年金の標準報酬月額の上限引上げ（令和9年9月〜68万円）は
          年度途中改定のため未反映で、高所得者の厚生年金保険料を低め（手取りを高め）に概算します。
        </div>
      )}

      <div className="app__grid">
        <div className="app__col">
          <InputForm form={form} onChange={onChange} />
          <ExtraDeductionsForm form={form} onChange={onChange} />
        </div>
        <ResultView result={result} />
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
      </footer>
    </main>
  )
}
