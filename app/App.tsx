import { useMemo, useState } from 'react'
import { calculateTakeHome, furusatoFromResult, getTaxTable } from '@core/index'
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

      <FurusatoView furusato={furusato} />

      <footer className="app__footer">
        <p>
          ※ 本ツールは<strong>概算</strong>です。確定申告書類の作成や個別の税務助言ではありません。
          社会保険料は協会けんぽ（東京）の等級表で計算しますが、年収を12等分した報酬月額を用い、
          賞与の分離や随時改定は考慮していません。給与所得のみを前提とし、住宅ローン控除・医療費控除・iDeCo 等は未対応です。
        </p>
        <p>
          すべての計算はブラウザ内で行われ、入力内容が保存・送信されることはありません。
          所得税は{eraLabel(result.taxYear)}分、個人住民税は翌年度（当年所得）の標準的な税率・控除に基づきます。
        </p>
      </footer>
    </main>
  )
}
