import type { TakeHomeResult } from '@core/index'
import { yen, perMonth, percent, eraLabel } from '../format'

interface Props {
  result: TakeHomeResult
}

const SEGMENT_COLORS = {
  takeHome: '#0b6e4f',
  social: '#3b82f6',
  incomeTax: '#f59e0b',
  residentTax: '#ef4444',
} as const

export function ResultView({ result: r }: Props) {
  const segments = [
    { key: 'takeHome', label: '手取り', value: r.takeHome, color: SEGMENT_COLORS.takeHome },
    { key: 'social', label: '社会保険料', value: r.socialInsurance.total, color: SEGMENT_COLORS.social },
    { key: 'incomeTax', label: '所得税', value: r.incomeTax, color: SEGMENT_COLORS.incomeTax },
    { key: 'residentTax', label: '住民税', value: r.residentTax, color: SEGMENT_COLORS.residentTax },
  ].filter((s) => s.value > 0)

  const base = Math.max(1, r.salaryIncome)

  return (
    <section className="card result" aria-label="計算結果">
      <h2 className="card__heading">計算結果（{eraLabel(r.taxYear)}・概算）</h2>

      <div className="result__headline">
        <div className="result__takehome">
          <span className="result__takehome-label">年間手取り</span>
          <span className="result__takehome-value">{yen(r.takeHome)}</span>
          <span className="result__takehome-sub">
            月あたり {perMonth(r.takeHome)} ／ 手取り率 {percent(r.takeHome / base)}
          </span>
        </div>
      </div>

      {/* 内訳バー */}
      <div className="bar" role="img" aria-label="年収の内訳">
        {segments.map((s) => (
          <div
            key={s.key}
            className="bar__segment"
            style={{ width: `${(s.value / base) * 100}%`, background: s.color }}
            title={`${s.label} ${yen(s.value)}`}
          />
        ))}
      </div>
      <ul className="legend">
        {segments.map((s) => (
          <li key={s.key} className="legend__item">
            <span className="legend__swatch" style={{ background: s.color }} />
            <span className="legend__label">{s.label}</span>
            <span className="legend__value">{yen(s.value)}</span>
          </li>
        ))}
      </ul>

      {/* 主要内訳 */}
      <table className="summary">
        <tbody>
          <Row label="額面年収" value={yen(r.salaryIncome)} strong />
          <Row label="社会保険料（健保・厚年・雇用ほか）" value={`− ${yen(r.socialInsurance.total)}`} />
          <Row label="所得税（復興特別所得税込み）" value={`− ${yen(r.incomeTax)}`} />
          <Row label="住民税（所得割＋均等割＋森林環境税）" value={`− ${yen(r.residentTax)}`} />
          <Row label="年間手取り" value={yen(r.takeHome)} strong highlight />
        </tbody>
      </table>

      {/* 詳細 */}
      <details className="detail">
        <summary>計算の詳細を見る</summary>
        <table className="summary summary--detail">
          <tbody>
            <Row label="給与所得（給与収入−給与所得控除）" value={yen(r.employmentIncome)} />
            <SubHeader label="社会保険料の内訳（本人負担・年額）" />
            <Row label="健康保険" value={yen(r.socialInsurance.health)} />
            {r.socialInsurance.longTermCare > 0 && <Row label="介護保険" value={yen(r.socialInsurance.longTermCare)} />}
            <Row label="厚生年金" value={yen(r.socialInsurance.pension)} />
            <Row label="雇用保険" value={yen(r.socialInsurance.employment)} />
            <SubHeader label="所得税" />
            <Row label="所得控除の合計" value={yen(r.incomeTaxDeductions.total)} />
            <Row label="課税所得（1,000円未満切捨て）" value={yen(r.taxableForIncomeTax)} />
            <SubHeader label="住民税" />
            <Row label="所得控除の合計" value={yen(r.residentTaxDeductions.total)} />
            <Row label="課税標準（1,000円未満切捨て）" value={yen(r.taxableForResidentTax)} />
            <Row label="所得割" value={yen(r.residentTaxDetail.incomePortion)} />
            <Row label="均等割" value={yen(r.residentTaxDetail.perCapita)} />
            <Row label="森林環境税" value={yen(r.residentTaxDetail.forestTax)} />
          </tbody>
        </table>
      </details>
    </section>
  )
}

function Row({ label, value, strong, highlight }: { label: string; value: string; strong?: boolean; highlight?: boolean }) {
  return (
    <tr className={highlight ? 'summary__row summary__row--highlight' : 'summary__row'}>
      <th className={strong ? 'summary__th summary__th--strong' : 'summary__th'}>{label}</th>
      <td className={strong ? 'summary__td summary__td--strong' : 'summary__td'}>{value}</td>
    </tr>
  )
}

function SubHeader({ label }: { label: string }) {
  return (
    <tr className="summary__subheader">
      <th colSpan={2}>{label}</th>
    </tr>
  )
}
