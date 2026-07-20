import type { FurusatoResult, FurusatoActualResult } from '@core/index'
import type { FormState, FurusatoMethod } from '../state'
import { yen, percent } from '../format'
import { NumberInput } from './NumberInput'

interface Props {
  furusato: FurusatoResult
  actual: FurusatoActualResult
  form: FormState
  onChange: (patch: Partial<FormState>) => void
}

export function FurusatoView({ furusato: f, actual: a, form, onChange }: Props) {
  // 個人事業主は確定申告が必要なためワンストップ特例は使えない（実効方式を強制）。
  const soleMode = form.mode === 'soleProprietor'
  const isOneStop = form.furusatoMethod === 'oneStop' && !soleMode
  const residentControl = isOneStop ? a.residentControlOneStop : a.residentControlFiling
  const residentTaxAfter = isOneStop ? a.residentTaxAfterOneStop : a.residentTaxAfterFiling
  const selfBurden = isOneStop ? a.selfBurdenOneStop : a.selfBurdenFiling
  const totalCredit = isOneStop ? a.totalCreditOneStop : a.totalCreditFiling
  const hasDonation = a.donation > 0 && f.limit > 0

  return (
    <section className="card furusato" aria-label="ふるさと納税">
      <h2 className="card__heading">ふるさと納税の控除上限額（目安）</h2>

      {f.limit > 0 ? (
        <>
          <div className="furusato__value">{yen(f.limit)}</div>
          <p className="furusato__lead">
            {form.inputMode === 'actual'
              ? '実績の所得にもとづく上限の目安です。すでに寄附した額の検算にどうぞ。'
              : `自己負担 ${yen(f.selfBurden)} で寄附できる上限の目安です。`}
          </p>
          <table className="summary">
            <tbody>
              <tr className="summary__row">
                <th className="summary__th">基礎となる住民税所得割額</th>
                <td className="summary__td">{yen(f.residentTaxIncomePortion)}</td>
              </tr>
              <tr className="summary__row">
                <th className="summary__th">所得税の限界税率</th>
                <td className="summary__td">{percent(f.marginalIncomeTaxRate)}</td>
              </tr>
              <tr className="summary__row">
                <th className="summary__th">特例控除に適用される税率</th>
                <td className="summary__td">{percent(f.specialCreditRate)}</td>
              </tr>
            </tbody>
          </table>
        </>
      ) : (
        <p className="furusato__lead">
          住民税の所得割が発生しないため、ふるさと納税による控除のメリットはほぼありません。
        </p>
      )}

      {/* 実績シミュレーション */}
      {f.limit > 0 && (
        <div className="furusato__actual">
          <h3 className="furusato__subheading">実績から次年度の住民税を試算</h3>
          <p className="furusato__lead">
            今年寄附した（する予定の）合計額を入れると、控除の内訳と<strong>翌年度の住民税</strong>がわかります。
          </p>

          <div className="furusato__method" role="radiogroup" aria-label="控除方式">
            <label className="furusato__radio">
              <input
                type="radio"
                name="furusato-method"
                checked={isOneStop}
                disabled={soleMode}
                onChange={() => onChange({ furusatoMethod: 'oneStop' as FurusatoMethod })}
              />
              ワンストップ特例（確定申告しない・5自治体まで）
            </label>
            <label className="furusato__radio">
              <input
                type="radio"
                name="furusato-method"
                checked={!isOneStop}
                onChange={() => onChange({ furusatoMethod: 'filing' as FurusatoMethod })}
              />
              確定申告
            </label>
          </div>
          {soleMode && (
            <p className="furusato__hint">※ 個人事業主は確定申告が必要なため、ワンストップ特例は利用できません。</p>
          )}

          <label className="yenfield">
            <span className="yenfield__label">寄附額（年間合計）</span>
            <span className="field__inline">
              <NumberInput
                className="field__number"
                ariaLabel="ふるさと納税の寄附額（年間合計）"
                value={form.furusatoDonation}
                max={10_000_000}
                onChange={(v) => onChange({ furusatoDonation: v })}
              />
              <span className="field__unit">円</span>
            </span>
          </label>

          {hasDonation && (
            <>
              <div
                role="status"
                aria-live="polite"
                className={`furusato__status ${a.withinLimit ? 'furusato__status--ok' : 'furusato__status--over'}`}
              >
                {a.withinLimit ? (
                  <>上限内 ✓ ／ 実質自己負担 {yen(selfBurden)}</>
                ) : (
                  <>
                    上限（{yen(f.limit)}）を {yen(a.donation - f.limit)} 超過。実質自己負担が {yen(selfBurden)} に増えています
                  </>
                )}
              </div>

              <table className="summary">
                <tbody>
                  {isOneStop ? (
                    <tr className="summary__row">
                      <th className="summary__th">
                        住民税からの控除
                        <span className="furusato__hint">
                          基本 {yen(a.residentBasicCredit)}＋特例 {yen(a.residentSpecialCredit)}＋申告特例 {yen(a.declarationSpecialCredit)}
                        </span>
                      </th>
                      <td className="summary__td">− {yen(a.residentControlOneStop)}</td>
                    </tr>
                  ) : (
                    <>
                      {a.incomeTaxCredit > 0 && (
                        <tr className="summary__row">
                          <th className="summary__th">所得税からの還付・軽減</th>
                          <td className="summary__td">− {yen(a.incomeTaxCredit)}</td>
                        </tr>
                      )}
                      <tr className="summary__row">
                        <th className="summary__th">
                          住民税からの控除
                          <span className="furusato__hint">基本 {yen(a.residentBasicCredit)}＋特例 {yen(a.residentSpecialCredit)}</span>
                        </th>
                        <td className="summary__td">− {yen(a.residentControlFiling)}</td>
                      </tr>
                    </>
                  )}
                  <tr className="summary__row">
                    <th className="summary__th">控除の合計</th>
                    <td className="summary__td">{yen(totalCredit)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="furusato__nextyear">
                <span className="furusato__nextyear-label">次年度の住民税</span>
                <span className="furusato__nextyear-value">
                  {yen(a.residentTaxBefore)} <span className="furusato__arrow">→</span> {yen(residentTaxAfter)}
                </span>
                <span className="furusato__nextyear-sub">
                  ふるさと納税で {yen(residentControl)} 軽減（{isOneStop ? 'ワンストップ特例' : '確定申告'}）
                </span>
              </div>
            </>
          )}

          <p className="furusato__note">
            ※ ワンストップ特例では所得税分も翌年度の住民税から控除されます（確定申告では所得税分は今年の所得税から還付）。
            上限内なら控除の合計額・実質負担はほぼ同じですが、<strong>上限を超えると</strong>ワンストップ特例は申告特例控除も
            住民税所得割の20%上限に連動して頭打ちになり、確定申告より不利（自己負担が大きく）になります。
            寄附は上限内に収めるのが前提です。
          </p>
        </div>
      )}

      <p className="furusato__note">
        ※ あくまで概算の目安です。医療費控除・iDeCo・生命保険料控除などの所得控除は上限額に反映済みです。
        住宅ローン控除（税額控除）はこの上限の基礎となる住民税所得割を直接は下げませんが、
        <strong>確定申告で併用する場合</strong>、住宅ローン控除が住民税に回る分の上限（課税総所得×5%・97,500円）を
        超えると自己負担が増えることがあります（ワンストップ特例なら所得税に影響せず回避できます）。
        上限内でも一律 {yen(f.selfBurden)} の自己負担が必要です。
      </p>
    </section>
  )
}
