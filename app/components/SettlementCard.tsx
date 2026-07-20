import type { SettlementResult } from '@core/index'
import { yen } from '../format'

interface Props {
  /** App 層で computeSettlement を合成した結果。 */
  settlement: SettlementResult
  /** 給与以外の所得（otherIncome の合計 ≠ 0）があるか（注記の分岐）。 */
  hasOtherIncome: boolean
  /** ワンストップ特例を選択し寄附がある（注記の分岐）。 */
  oneStopWithDonation: boolean
}

/**
 * 精算カード（実額タブ・源泉徴収税額を入力したときのみ App が条件レンダリング）。
 * 算出した年税額と源泉徴収税額の差から還付/追徴の目安を出す。「確定」の語は使わない
 * （所得税は申告ベースの試算、住民税は自治体決定額と端数処理等で差が出る計算値のため）。
 */
export function SettlementCard({ settlement: s, hasOtherIncome, oneStopWithDonation }: Props) {
  const isRefund = s.diff < 0
  const isDue = s.diff > 0
  const statusClass = isDue ? 'furusato__status--over' : 'furusato__status--ok'
  const statusText = isRefund
    ? `確定申告での還付見込み ${yen(-s.diff)}`
    : isDue
      ? `追加納付の見込み ${yen(s.diff)}`
      : '過不足なし（年末調整で精算済みの見込み）'

  return (
    <section className="card settlement" aria-label="還付・追徴の目安">
      <h2 className="card__heading">還付・追徴の目安（実額ベース・概算）</h2>

      <table className="summary">
        <tbody>
          <tr className="summary__row">
            <th className="summary__th">算出した年税額（復興税込み・住宅ローン控除後）</th>
            <td className="summary__td">{yen(s.annualTax)}</td>
          </tr>
          {s.furusatoCredit > 0 && (
            <tr className="summary__row">
              <th className="summary__th">うち ふるさと納税の還付分</th>
              <td className="summary__td">− {yen(s.furusatoCredit)}</td>
            </tr>
          )}
          <tr className="summary__row">
            <th className="summary__th">源泉徴収税額</th>
            <td className="summary__td">− {yen(s.withheld)}</td>
          </tr>
          <tr className="summary__row summary__row--highlight">
            <th className="summary__th summary__th--strong">差額</th>
            <td className="summary__td summary__td--strong">
              {s.diff === 0 ? yen(0) : s.diff < 0 ? `△ ${yen(-s.diff)}` : `＋ ${yen(s.diff)}`}
            </td>
          </tr>
        </tbody>
      </table>

      <div role="status" aria-live="polite" className={`furusato__status ${statusClass}`}>
        {statusText}
      </div>

      {isDue && !hasOtherIncome && (
        <p className="field__note">
          源泉徴収票に記載の控除（生命保険料・地震保険料・住宅ローン控除など）の入力漏れがないか確認してください。
        </p>
      )}
      {hasOtherIncome && <p className="field__note">この差額は確定申告で納付する見込み額の目安です。</p>}
      <p className="field__note">
        <strong>還付は確定申告をしなければ戻りません</strong>。住民税は還付ではなく翌年度の税額に反映されます。
      </p>
      {oneStopWithDonation && (
        <p className="field__note">
          ワンストップ特例では所得税からの還付はなく、全額が翌年度の住民税から控除されます。
        </p>
      )}
    </section>
  )
}
