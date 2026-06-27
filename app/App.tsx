import { useMemo, useState } from 'react'
import { calculateTakeHome } from '@core/index'
import { defaultForm, toInput, type FormState } from './state'
import { InputForm } from './components/InputForm'
import { ResultView } from './components/ResultView'

export function App() {
  const [form, setForm] = useState<FormState>(defaultForm)
  const onChange = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  const result = useMemo(() => calculateTakeHome(toInput(form)), [form])

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">tezukai</h1>
        <p className="app__subtitle">手取り税金シミュレータ（令和7年・概算）</p>
      </header>

      <div className="app__grid">
        <InputForm form={form} onChange={onChange} />
        <ResultView result={result} />
      </div>

      <footer className="app__footer">
        <p>
          ※ 本ツールは<strong>概算</strong>です。確定申告書類の作成や個別の税務助言ではありません。
          社会保険料は標準報酬月額を簡易計算しており、実額（協会けんぽ等の等級表）とは差が出る場合があります。
          給与所得のみを前提とし、住宅ローン控除・医療費控除・iDeCo 等は未対応です。
        </p>
        <p>
          すべての計算はブラウザ内で行われ、入力内容が保存・送信されることはありません。
          所得税は令和7年分、個人住民税は令和8年度（令和7年所得）の標準的な税率・控除に基づきます。
        </p>
      </footer>
    </main>
  )
}
