import type { TakeHomeResult } from '@core/index'
import { yen, perMonth, percent, eraLabel } from '../format'

interface Props {
  result: TakeHomeResult
}

// テーマ変数で定義（ダークモードで明度を上げてコントラストを確保）。
const SEGMENT_COLORS = {
  takeHome: 'var(--seg-takehome)',
  childcare: 'var(--seg-childcare)',
  social: 'var(--seg-social)',
  incomeTax: 'var(--seg-incometax)',
  residentTax: 'var(--seg-residenttax)',
} as const

export function ResultView({ result: r }: Props) {
  // 育休給付金は非課税で手取りに含まれる。バーは「就労手取り＋給付金＋社保＋税」で総収入を分解。
  const childcareTotal = r.childcareLeave?.total ?? 0
  // 出生後休業支援給付金を含むときは「等」を付けて合算であることを示す（内訳は詳細で分解）。
  const hasPostBirth = (r.childcareLeave?.postBirthBenefit ?? 0) > 0
  const childcareLabel = hasPostBirth ? '育児休業給付金等（非課税）' : '育児休業給付金（非課税）'
  const segments = [
    { key: 'takeHome', label: childcareTotal > 0 ? '手取り（就労分）' : '手取り', value: r.takeHome - childcareTotal, color: SEGMENT_COLORS.takeHome },
    { key: 'childcare', label: childcareLabel, value: childcareTotal, color: SEGMENT_COLORS.childcare },
    { key: 'social', label: '社会保険料', value: r.socialInsurance.total, color: SEGMENT_COLORS.social },
    { key: 'incomeTax', label: '所得税', value: r.incomeTax, color: SEGMENT_COLORS.incomeTax },
    { key: 'residentTax', label: '住民税', value: r.residentTax, color: SEGMENT_COLORS.residentTax },
  ].filter((s) => s.value > 0)

  const isSole = r.mode === 'soleProprietor'
  const base = Math.max(1, r.grossIncome + childcareTotal)
  const grossLabel = isSole
    ? '事業収入−必要経費（＋給与以外の所得）'
    : childcareTotal > 0
      ? '就労期間の給与（育休分を除く・額面）'
      : '額面年収'
  const socialLabel = isSole ? '社会保険料（国民年金・国民健康保険）' : '社会保険料（健保・厚年・雇用ほか）'
  // 令和9〜は復興特別所得税1.1%＋防衛特別所得税1.0%、令和8以前は復興2.1%。
  const surtaxNote = r.taxYear >= 2027 ? '復興1.1%＋防衛特別所得税1.0%込み' : '復興特別所得税込み'

  return (
    <section className="card result" aria-label="計算結果">
      <h2 className="card__heading">計算結果（{eraLabel(r.taxYear)}・概算）</h2>

      <div className="result__headline">
        <div className="result__takehome" role="status" aria-live="polite" aria-atomic="true">
          <span className="result__takehome-label">年間手取り</span>
          <span className="result__takehome-value">{yen(r.takeHome)}</span>
          <span className="result__takehome-sub">
            月あたり {perMonth(r.takeHome)} ／ 手取り率 {percent(r.takeHome / base)}
          </span>
        </div>
      </div>

      {/* 内訳バー（情報は下の凡例・表が正本。バー自体は装飾） */}
      <div className="bar" aria-hidden="true">
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
          <Row label={grossLabel} value={yen(r.grossIncome)} strong />
          {isSole && (
            <Row label="うち事業所得（青色申告特別控除後）" value={yen(r.businessIncome)} />
          )}
          <Row label={socialLabel} value={`− ${yen(r.socialInsurance.total)}`} />
          <Row label={`所得税（${surtaxNote}）`} value={`− ${yen(r.incomeTax)}`} />
          <Row label="住民税（所得割＋均等割＋森林環境税）" value={`− ${yen(r.residentTax)}`} />
          {r.childcareLeave && r.childcareLeave.total > 0 && (
            <Row label={childcareLabel} value={`＋ ${yen(r.childcareLeave.total)}`} />
          )}
          <Row label="年間手取り" value={yen(r.takeHome)} strong highlight />
        </tbody>
      </table>

      {isSole && (
        <p className="result__note">
          ※ 国民健康保険は<strong>東京特別区</strong>の率による概算です（所得割は本人の所得のみ・均等割×加入人数。世帯員の所得や自治体差は未反映）。
          {r.taxYear === 2026 && <>令和8年度の保険料率は未公表のため<strong>令和7年度率で概算</strong>しています。</>}
        </p>
      )}

      {r.medicalExpense && (
        <p className="result__note">
          医療費控除は
          <strong>
            {r.medicalExpense.method === 'selfMedication' ? 'セルフメディケーション税制' : '通常の医療費控除'}
          </strong>
          を適用（控除額 {yen(r.medicalExpense.amount)}）
        </p>
      )}

      {r.childcareLeave && (
        <p className="result__note">
          育児休業給付金（非課税）{yen(r.childcareLeave.total)} を手取りに加算。育休
          {r.childcareLeave.periodCount > 1
            ? ` 通算${r.childcareLeave.leaveDays}日（${r.childcareLeave.periodCount}回に分割）で`
            : ` ${r.childcareLeave.leaveDays}日で`}
          社会保険料は<strong>{r.childcareLeave.exemptMonths}か月分が免除</strong>されています。
          この住民税は当年（育休年）の所得に対する<strong>翌年度分</strong>で、育休による所得減を反映して下がります。
          一方、育休年中に実際に納める住民税は前年所得ベースのため下がりません。
        </p>
      )}

      {/* 詳細 */}
      <details className="detail">
        <summary>計算の詳細を見る</summary>
        <table className="summary summary--detail">
          <tbody>
            {isSole ? (
              <Row label="事業所得（収入−必要経費−青色控除）" value={yen(r.businessIncome)} />
            ) : (
              <Row label="給与所得（給与収入−給与所得控除）" value={yen(r.employmentIncome)} />
            )}
            {r.incomeAdjustment > 0 && <Row label="所得金額調整控除" value={`− ${yen(r.incomeAdjustment)}`} />}
            {r.otherIncomeTotal !== 0 && <Row label="給与以外の所得（損益通算後）" value={yen(r.otherIncomeTotal)} />}
            {(isSole || r.incomeAdjustment > 0 || r.otherIncomeTotal !== 0) && (
              <Row label="合計所得金額" value={yen(r.totalIncome)} />
            )}
            {r.childcareLeave && (
              <>
                <SubHeader label="育児休業（非課税給付・社保免除）" />
                {r.childcareLeave.periodCount > 1 && (
                  <Row label="育休の分割回数" value={`${r.childcareLeave.periodCount} 回`} />
                )}
                <Row
                  label={r.childcareLeave.periodCount > 1 ? '育休日数（通算）' : '育休日数'}
                  value={`${r.childcareLeave.leaveDays} 日`}
                />
                <Row label="社会保険料の免除月数" value={`${r.childcareLeave.exemptMonths} か月`} />
                <Row label="育児休業給付金" value={yen(r.childcareLeave.benefit)} />
                {r.childcareLeave.postBirthBenefit > 0 && (
                  <>
                    <Row label="出生後休業支援給付金" value={yen(r.childcareLeave.postBirthBenefit)} />
                    <Row label="給付金 合計（非課税・手取りに加算）" value={yen(r.childcareLeave.total)} />
                  </>
                )}
              </>
            )}
            <SubHeader label="社会保険料の内訳（本人負担・年額）" />
            <Row label={isSole ? '国民健康保険（医療＋支援金）' : '健康保険'} value={yen(r.socialInsurance.health)} />
            {r.socialInsurance.longTermCare > 0 && (
              <Row label={isSole ? '国民健康保険（介護分）' : '介護保険'} value={yen(r.socialInsurance.longTermCare)} />
            )}
            <Row label={isSole ? '国民年金' : '厚生年金'} value={yen(r.socialInsurance.pension)} />
            {!isSole && <Row label="雇用保険" value={yen(r.socialInsurance.employment)} />}
            <SubHeader label="所得税" />
            <Row label="所得控除の合計" value={yen(r.incomeTaxDeductions.total)} />
            <Row label="課税所得（1,000円未満切捨て）" value={yen(r.taxableForIncomeTax)} />
            <Row label={`所得税額（${surtaxNote}）`} value={yen(r.incomeTax)} />
            <SubHeader label="住民税" />
            <Row label="所得控除の合計" value={yen(r.residentTaxDeductions.total)} />
            <Row label="課税標準（1,000円未満切捨て）" value={yen(r.taxableForResidentTax)} />
            <Row label="所得割（調整控除後・住宅ローン控除前）" value={yen(r.residentTaxDetail.incomePortion)} />
            <Row label="均等割" value={yen(r.residentTaxDetail.perCapita)} />
            <Row label="森林環境税" value={yen(r.residentTaxDetail.forestTax)} />
            {r.housingLoanCredit.total > 0 && (
              <>
                <SubHeader label="住宅ローン控除（税額控除）" />
                <Row label="控除可能額（年末残高×0.7%）" value={yen(r.housingLoanCredit.available)} />
                <Row label="所得税からの控除" value={`− ${yen(r.housingLoanCredit.appliedToIncomeTax)}`} />
                <Row label="住民税からの控除（繰越）" value={`− ${yen(r.housingLoanCredit.appliedToResidentTax)}`} />
              </>
            )}
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
