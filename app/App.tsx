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
          すべての計算はブラウザ内で行われ、入力内容が保存・送信されることはありません。
          所得税は{eraLabel(result.taxYear)}分、個人住民税は翌年度（当年所得）の標準的な税率・控除に基づきます。
        </p>
      </footer>
    </main>
  )
}
