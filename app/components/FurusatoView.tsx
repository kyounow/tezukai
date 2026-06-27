import type { FurusatoResult } from '@core/index'
import { yen, percent } from '../format'

interface Props {
  furusato: FurusatoResult
}

export function FurusatoView({ furusato: f }: Props) {
  return (
    <section className="card furusato" aria-label="ふるさと納税">
      <h2 className="card__heading">ふるさと納税の控除上限額（目安）</h2>

      {f.limit > 0 ? (
        <>
          <div className="furusato__value">{yen(f.limit)}</div>
          <p className="furusato__lead">
            自己負担 {yen(f.selfBurden)} で寄附できる上限の目安です。
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
            </tbody>
          </table>
        </>
      ) : (
        <p className="furusato__lead">
          住民税の所得割が発生しないため、ふるさと納税による控除のメリットはほぼありません。
        </p>
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
