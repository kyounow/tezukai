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
        ※ あくまで概算の目安です。ワンストップ特例制度／確定申告の別や、住宅ローン控除・医療費控除など他の控除によって
        実際の上限は変わります。上限内でも一律 {yen(f.selfBurden)} の自己負担が必要です。
      </p>
    </section>
  )
}
