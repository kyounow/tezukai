import { useState } from 'react'
import { AVAILABLE_TAX_YEARS, getTaxTable } from '@core/index'
import type { BlueDeduction, TaxpayerMode, TaxYear } from '@core/index'
import type { FormState } from '../state'
import { eraLabel, man } from '../format'
import { NumberInput } from './NumberInput'

interface Props {
  form: FormState
  onChange: (patch: Partial<FormState>) => void
}

function toNumber(value: string): number {
  const n = Number(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** 額面年収の上限。スライダーは2000万まで・数値入力は5000万まで（大多数の200万〜1000万帯の操作精度を優先）。 */
const SLIDER_MAX = 20_000_000
const SALARY_MAX = 50_000_000
/** スライダーの目盛り（ガイド）ラベル。スライダー上限（2000万）基準で配置する。 */
const SALARY_TICKS: { value: number; label: string }[] = [
  { value: 0, label: '0' },
  { value: 5_000_000, label: '500万' },
  { value: 10_000_000, label: '1000万' },
  { value: 15_000_000, label: '1500万' },
  { value: 20_000_000, label: '2000万' },
]

export function InputForm({ form, onChange }: Props) {
  // 実額（源泉徴収票）モードでは収入 fieldset を差し替え、賞与スライダー・育休・健保種別を隠す。
  const actual = form.inputMode === 'actual'
  return (
    <section className="card form" aria-label="入力">
      <h2 className="card__heading">入力</h2>

      {/* 納税者区分 */}
      <div className="field">
        <label className="field__label" htmlFor="mode">
          区分
        </label>
        <select
          id="mode"
          className="field__select"
          value={form.mode}
          onChange={(e) => onChange({ mode: e.target.value as TaxpayerMode })}
        >
          <option value="employee">給与所得者（会社員・パート）</option>
          <option value="soleProprietor">個人事業主（事業所得）</option>
        </select>
      </div>

      {/* ========== 収入 ========== */}
      <fieldset className="field form__group">
        <legend className="field__label">
          {actual ? `${eraLabel(form.taxYear)}分の源泉徴収票の金額を入力` : '収入'}
        </legend>

        {/* 実額タブ: 対象年度を再掲（源泉徴収票の「令和◯年分」とアプリの年度のズレ事故を防ぐ・詳細設定内と同一 state）。 */}
        {actual && (
          <div className="field">
            <label className="field__label" htmlFor="actual-tax-year">
              対象年度
              <span className="field__hint">源泉徴収票の「令和◯年分」と合わせる</span>
            </label>
            <select
              id="actual-tax-year"
              className="field__select"
              value={form.taxYear}
              onChange={(e) => onChange({ taxYear: Number(e.target.value) as TaxYear })}
            >
              {AVAILABLE_TAX_YEARS.map((y) => (
                <option key={y} value={y}>
                  {eraLabel(y)}
                  {getTaxTable(y).provisional ? '・暫定' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {form.mode === 'soleProprietor' && (
          <>
            <div className="field">
              <label className="field__label" htmlFor="bus-revenue">
                事業収入（売上）
              </label>
              <div className="field__inline">
                <NumberInput id="bus-revenue" className="field__number" value={form.busRevenue} max={1_000_000_000} onChange={(v) => onChange({ busRevenue: v })} />
                <span className="field__unit">円</span>
              </div>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="bus-expenses">
                必要経費
              </label>
              <div className="field__inline">
                <NumberInput id="bus-expenses" className="field__number" value={form.busExpenses} max={1_000_000_000} onChange={(v) => onChange({ busExpenses: v })} />
                <span className="field__unit">円</span>
              </div>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="blue">
                申告方法（青色申告特別控除）
              </label>
              <select id="blue" className="field__select" value={form.blueDeduction} onChange={(e) => onChange({ blueDeduction: e.target.value as BlueDeduction })}>
                <option value="65">青色65万円（複式簿記＋e-Tax/電子帳簿保存）</option>
                <option value="55">青色55万円（複式簿記）</option>
                <option value="10">青色10万円（簡易簿記等）</option>
                <option value="none">白色申告（控除なし）</option>
              </select>
            </div>
            {/* 実額タブは国民年金＋国保の実額を社保欄で受けるため（nationalInsurance を呼ばない）加入人数は不要。 */}
            {!actual && (
              <div className="field">
                <label className="field__label" htmlFor="kokuho-members">
                  国民健康保険の加入人数
                  <span className="field__hint">均等割の人数（世帯）</span>
                </label>
                <div className="field__inline">
                  <input
                    id="kokuho-members"
                    className="field__number field__number--narrow"
                    type="number"
                    min={1}
                    max={15}
                    value={form.kokuhoMembers}
                    onChange={(e) => onChange({ kokuhoMembers: Math.max(1, Math.min(15, toNumber(e.target.value))) })}
                  />
                  <span className="field__unit">人</span>
                </div>
              </div>
            )}

            {/* 実額タブ（個人事業主）: 国民年金・国保等の実額と iDeCo 再掲。源泉徴収税額欄は出さない（報酬源泉は v1 対象外）。 */}
            {actual && (
              <>
                <div className="field">
                  <label className="field__label" htmlFor="actual-social">
                    国民年金・国民健康保険などの実額（年間に支払った合計）
                  </label>
                  <div className="field__inline">
                    <NumberInput
                      id="actual-social"
                      className="field__number"
                      ariaLabel="国民年金・国民健康保険などの実額（年間に支払った合計）"
                      value={form.actualSocialInsurance}
                      max={20_000_000}
                      onChange={(v) => onChange({ actualSocialInsurance: v })}
                    />
                    <span className="field__unit">円</span>
                  </div>
                  <p className="field__note">
                    国民年金基金・付加保険料も含めてよい（全額社会保険料控除）。iDeCo・小規模企業共済掛金は含めず下の iDeCo 欄へ。
                  </p>
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="actual-ideco-sole">
                    iDeCo・小規模企業共済等掛金（再掲）
                    <span className="field__hint">拡張控除カードと同じ欄（連動）</span>
                  </label>
                  <div className="field__inline">
                    <NumberInput
                      id="actual-ideco-sole"
                      className="field__number"
                      ariaLabel="iDeCo・小規模企業共済等掛金（再掲）"
                      value={form.idecoAnnual}
                      max={10_000_000}
                      onChange={(v) => onChange({ idecoAnnual: v })}
                    />
                    <span className="field__unit">円</span>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {form.mode === 'employee' && !actual && (
          <>
            {form.bonusMode ? (
              <>
                <div className="field">
                  <label className="field__label" htmlFor="monthly-salary">
                    月給（月額）
                    <span className="field__hint" aria-hidden="true">社会保険料の計算のもと（標準報酬月額）</span>
                  </label>
                  <div className="field__inline">
                    <NumberInput id="monthly-salary" className="field__number" value={form.monthlySalary} max={10_000_000} onChange={(v) => onChange({ monthlySalary: v })} />
                    <span className="field__unit">円</span>
                  </div>
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="annual-bonus">
                    年間賞与（合計）
                  </label>
                  <div className="field__inline">
                    <NumberInput id="annual-bonus" className="field__number" value={form.annualBonus} max={100_000_000} onChange={(v) => onChange({ annualBonus: v })} />
                    <span className="field__unit">円</span>
                  </div>
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="bonus-count">
                    賞与の支給回数
                    <span className="field__hint">額面年収 ≒ {man(form.monthlySalary * 12 + form.annualBonus)}</span>
                  </label>
                  <div className="field__inline">
                    <input
                      id="bonus-count"
                      className="field__number field__number--narrow"
                      type="number"
                      min={1}
                      max={12}
                      value={form.bonusCount}
                      onChange={(e) => onChange({ bonusCount: Math.max(1, Math.min(12, toNumber(e.target.value))) })}
                    />
                    <span className="field__unit">回</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="field">
                <label className="field__label" htmlFor="salary">
                  額面年収
                  {/* 現在値はスライダーのアクセシブル名に混ぜず、視覚表示のみ（読み上げは aria-valuetext で行う）。 */}
                  <span className="field__hint" aria-hidden="true">{man(form.salaryIncome)}</span>
                </label>
                <input
                  id="salary"
                  className="field__range"
                  type="range"
                  min={0}
                  max={SLIDER_MAX}
                  step={100_000}
                  value={Math.min(form.salaryIncome, SLIDER_MAX)}
                  aria-valuetext={
                    form.salaryIncome > SLIDER_MAX
                      ? `2000万円超（実際の値: ${man(form.salaryIncome)}）`
                      : man(Math.min(form.salaryIncome, SLIDER_MAX))
                  }
                  onChange={(e) => onChange({ salaryIncome: toNumber(e.target.value) })}
                />
                <div className="field__scale" aria-hidden="true">
                  <div className="field__scale-inner">
                    {SALARY_TICKS.map((t) => (
                      <span
                        key={t.value}
                        className="field__scale-tick"
                        style={{ left: `${(t.value / SLIDER_MAX) * 100}%` }}
                      >
                        {t.label}
                      </span>
                    ))}
                  </div>
                </div>
                {form.salaryIncome > SLIDER_MAX && (
                  <p className="field__note">スライダー範囲外です（数値入力で調整してください）。</p>
                )}
                <div className="field__inline">
                  <NumberInput id="salary-number" className="field__number" ariaLabel="額面年収（数値入力）" value={form.salaryIncome} max={SALARY_MAX} onChange={(v) => onChange({ salaryIncome: v })} />
                  <span className="field__unit">円</span>
                </div>
              </div>
            )}

            {/* 賞与分離モードの切替 */}
            <div className="field">
              <label className="field__check field__check--small">
                <input type="checkbox" checked={form.bonusMode} onChange={(e) => onChange({ bonusMode: e.target.checked })} />
                賞与を分けて社会保険料を精密に計算する
              </label>
            </div>

            {/* 育児休業 */}
            <div className="field">
              <label className="field__check field__check--small">
                <input type="checkbox" checked={form.childcareLeave} onChange={(e) => onChange({ childcareLeave: e.target.checked })} />
                この年に育児休業を取得する
              </label>
            </div>
            {form.childcareLeave && (
              <>
                <p className="field__note">
                  育休中は給与が減り、<strong>育児休業給付金（非課税）</strong>を受け、健康保険・厚生年金・介護保険料が<strong>免除</strong>されます。
                  住民税は当年所得に対する翌年度分として試算します（育休年に実際に納める分は前年所得ベースで下がりません）。
                  分割育休は「期間を追加」で複数登録でき、給付率（67%/50%）は通算日数で判定します。日割り・賃金日額は概算です。
                </p>
                {form.childcareLeavePeriods.map((p, i) => {
                  const update = (patch: { start?: string; end?: string }) =>
                    onChange({
                      childcareLeavePeriods: form.childcareLeavePeriods.map((q, idx) => (idx === i ? { ...q, ...patch } : q)),
                    })
                  const seq = form.childcareLeavePeriods.length > 1 ? `（${i + 1}回目）` : ''
                  const invalid = p.start && p.end && p.end < p.start
                  return (
                    <div className="childcare-period" key={i}>
                      <label className="selectfield">
                        <span>育休 開始日{seq}</span>
                        <input className="field__select" type="date" value={p.start} onChange={(e) => update({ start: e.target.value })} />
                      </label>
                      <label className="selectfield">
                        <span>育休 終了日{seq}</span>
                        <input className="field__select" type="date" value={p.end} onChange={(e) => update({ end: e.target.value })} />
                      </label>
                      {invalid && (
                        <p className="field__note field__note--warn" role="alert">
                          育休の終了日は開始日以降の日付にしてください（この期間は計算されません）。
                        </p>
                      )}
                      {form.childcareLeavePeriods.length > 1 && (
                        <button
                          type="button"
                          className="childcare-period__remove"
                          onClick={() =>
                            onChange({ childcareLeavePeriods: form.childcareLeavePeriods.filter((_, idx) => idx !== i) })
                          }
                        >
                          この期間を削除
                        </button>
                      )}
                    </div>
                  )
                })}
                <button
                  type="button"
                  className="childcare-add"
                  onClick={() => onChange({ childcareLeavePeriods: [...form.childcareLeavePeriods, { start: '', end: '' }] })}
                >
                  ＋ 育休期間を追加（分割育休）
                </button>
                {form.childcareLeavePeriods.some(
                  (p) =>
                    (p.start && p.start.slice(0, 4) !== String(form.taxYear)) ||
                    (p.end && p.end.slice(0, 4) !== String(form.taxYear)),
                ) && (
                  <p className="field__note field__note--warn" role="alert">
                    育休期間に{eraLabel(form.taxYear)}以外の日付が含まれます。本ツールは選択中の年（{eraLabel(form.taxYear)}）の
                    育休日数のみを当年分として計算します。年をまたぐ育休は年度を切り替えて各年を確認してください。
                  </p>
                )}
                <div className="field">
                  <label className="field__label" htmlFor="childcare-presalary">
                    育休前の月給
                  </label>
                  <div className="field__inline">
                    <NumberInput
                      id="childcare-presalary"
                      className="field__number"
                      ariaLabel="育休前の月給"
                      value={form.childcareLeavePreSalary}
                      max={3_000_000}
                      onChange={(v) => onChange({ childcareLeavePreSalary: v })}
                    />
                    <span className="field__unit">円</span>
                  </div>
                  {form.childcareLeavePreSalary <= 0 && (
                    <p className="field__note field__note--warn" role="alert">
                      育休前の月給を入力してください（0のままだと育児休業給付金が計算されません）。
                    </p>
                  )}
                </div>
                <label className="field__check field__check--small">
                  <input
                    type="checkbox"
                    checked={form.childcarePostBirthSupport}
                    onChange={(e) => onChange({ childcarePostBirthSupport: e.target.checked })}
                  />
                  出生後休業支援給付金（両親とも14日以上育休・13%上乗せ・最大28日）
                </label>
                <label className="field__check field__check--small">
                  <input
                    type="checkbox"
                    checked={form.childcareExemptBonus}
                    onChange={(e) => onChange({ childcareExemptBonus: e.target.checked })}
                  />
                  賞与の社会保険料も免除（賞与月末を含む連続1か月超の育休）
                </label>
              </>
            )}
          </>
        )}

        {/* ===== 実額タブ（給与所得者）: 源泉徴収票の券面に忠実な入力 ===== */}
        {form.mode === 'employee' && actual && (
          <>
            <div className="field">
              <label className="field__label" htmlFor="actual-salary">
                支払金額
              </label>
              <div className="field__inline">
                <NumberInput
                  id="actual-salary"
                  className="field__number"
                  ariaLabel="支払金額"
                  value={form.actualSalary}
                  max={SALARY_MAX}
                  onChange={(v) => onChange({ actualSalary: v })}
                />
                <span className="field__unit">円</span>
              </div>
              <p className="field__note">
                源泉徴収票の左上『支払金額』欄（税・社会保険料が引かれる前の額面。振込額ではありません）。
                非課税の通勤手当は含まれないのでそのまま転記。転職した年は前職分合算で年末調整済みの源泉徴収票ならそのまま入力。
              </p>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="actual-social-emp">
                社会保険料等の金額
              </label>
              <div className="field__inline">
                <NumberInput
                  id="actual-social-emp"
                  className="field__number"
                  ariaLabel="社会保険料等の金額"
                  value={form.actualSocialInsurance}
                  max={20_000_000}
                  onChange={(v) => onChange({ actualSocialInsurance: v })}
                />
                <span className="field__unit">円</span>
              </div>
              <p className="field__note">
                源泉徴収票の『社会保険料等の金額』欄。
                <strong>金額の上に「内」表記（小規模企業共済等掛金）がある場合は、合計から内書き分を差し引いた額をここに</strong>、
                内書き分は下の iDeCo 欄へ（両方に入れると手取りが過小・二重控除になります）。
                年末調整で申告し忘れた国民年金等があればこの欄の金額に<strong>加算</strong>して入力。
              </p>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="actual-ideco-emp">
                iDeCo・小規模企業共済等掛金（再掲）
                <span className="field__hint">拡張控除カードと同じ欄（連動）</span>
              </label>
              <div className="field__inline">
                <NumberInput
                  id="actual-ideco-emp"
                  className="field__number"
                  ariaLabel="iDeCo・小規模企業共済等掛金（再掲）"
                  value={form.idecoAnnual}
                  max={10_000_000}
                  onChange={(v) => onChange({ idecoAnnual: v })}
                />
                <span className="field__unit">円</span>
              </div>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="actual-withholding">
                源泉徴収税額<span className="field__hint">任意</span>
              </label>
              <div className="field__inline">
                <input
                  id="actual-withholding"
                  className="field__number"
                  type="text"
                  inputMode="numeric"
                  placeholder="未入力"
                  aria-label="源泉徴収税額"
                  value={form.actualWithholding === null ? '' : form.actualWithholding.toLocaleString('ja-JP')}
                  onChange={(e) => {
                    const raw = e.target.value
                    if (raw.trim() === '') {
                      onChange({ actualWithholding: null })
                      return
                    }
                    const digits = raw.replace(/[^0-9]/g, '')
                    onChange({ actualWithholding: digits === '' ? 0 : Math.min(50_000_000, Number(digits)) })
                  }}
                />
                <span className="field__unit">円</span>
              </div>
              <p className="field__note">
                源泉徴収票の『源泉徴収税額』欄。0円の場合も入力すると精算の目安を表示します。
              </p>
            </div>

            <p className="field__note">
              源泉徴収票に記載のある控除は<strong>すべて入力が必要</strong>です
              （配偶者・扶養・保険料・2年目以降の住宅ローン控除など。入力しないと差額が正しく出ません）。
              生命保険料は『生命保険料の控除額』欄ではなく、<strong>内訳の支払保険料</strong>（新生命保険料の金額など）から転記してください。
              2年目以降の住宅ローン控除は源泉徴収票の『住宅借入金等特別控除の額』欄に対応します。
            </p>
          </>
        )}
      </fieldset>

      {/* ========== あなたと家族 ========== */}
      <fieldset className="field form__group">
        <legend className="field__label">あなたと家族</legend>

        {/* 年齢 */}
        <div className="field">
          <label className="field__label" htmlFor="age">
            年齢
            <span className="field__hint">40〜64歳は介護保険料が加算</span>
          </label>
          <div className="field__inline">
            <input
              id="age"
              className="field__number field__number--narrow"
              type="number"
              min={16}
              max={120}
              value={form.age}
              onChange={(e) => onChange({ age: Math.max(0, Math.min(120, toNumber(e.target.value))) })}
            />
            <span className="field__unit">歳</span>
          </div>
        </div>
        {form.mode === 'employee' && form.age >= 65 && (
          <p className="field__note">
            {form.age >= 75
              ? '※ 75歳以上は健康保険から後期高齢者医療制度へ移行します（健保・厚年の給与天引きなし。後期高齢者医療保険料は本ツール未対応・別途個人負担）。'
              : form.age >= 70
                ? '※ 70歳以上は厚生年金保険の資格を喪失するため厚生年金保険料はかかりません（健保・雇用は継続）。'
                : '※ 65歳以上は介護保険が第1号となり、給与天引きでなく年金天引き等で別途納付します（本ツールの社会保険料には含めません）。'}
          </p>
        )}

        {/* 本人について（障害者・ひとり親・寡婦・勤労学生） */}
        <fieldset className="field">
          <legend className="field__label">本人について（障害者・ひとり親など）</legend>
          <label className="selectfield" htmlFor="personal-disability">
            <span>障害者控除</span>
            <select
              id="personal-disability"
              className="field__select"
              value={form.personalDisability}
              onChange={(e) => onChange({ personalDisability: e.target.value as 'none' | 'normal' | 'special' })}
            >
              <option value="none">該当なし</option>
              <option value="normal">普通障害者（控除27万円）</option>
              <option value="special">特別障害者（控除40万円）</option>
            </select>
          </label>
          <label className="field__check field__check--small">
            <input
              type="checkbox"
              checked={form.personalSingleParent}
              onChange={(e) =>
                onChange({ personalSingleParent: e.target.checked, personalWidow: e.target.checked ? false : form.personalWidow })
              }
            />
            ひとり親（合計所得500万円以下・控除35万円）
          </label>
          {!form.personalSingleParent && (
            <label className="field__check field__check--small">
              <input
                type="checkbox"
                checked={form.personalWidow}
                onChange={(e) => onChange({ personalWidow: e.target.checked })}
              />
              寡婦（合計所得500万円以下・控除27万円）
            </label>
          )}
          <label className="field__check field__check--small">
            <input
              type="checkbox"
              checked={form.personalWorkingStudent}
              onChange={(e) => onChange({ personalWorkingStudent: e.target.checked })}
            />
            勤労学生（合計所得75万円以下・控除27万円）
          </label>
          <p className="field__note">
            障害者・寡婦・ひとり親のいずれかに該当し合計所得金額が135万円以下（給与収入のみなら約204万円以下）の場合、
            住民税が非課税になります（地方税法295条・本人分の概算）。
          </p>
        </fieldset>

        {/* 配偶者 */}
        <div className="field">
          <label className="field__check">
            <input
              type="checkbox"
              checked={form.hasSpouse}
              onChange={(e) => onChange({ hasSpouse: e.target.checked })}
            />
            配偶者がいる
          </label>
          {form.hasSpouse && (
            <div className="field__sub">
              <label className="selectfield" htmlFor="spouse-income-type">
                <span>配偶者の収入の種類</span>
                <select
                  id="spouse-income-type"
                  className="field__select"
                  value={form.spouseIncomeType}
                  onChange={(e) => onChange({ spouseIncomeType: e.target.value as 'salary' | 'pension' })}
                >
                  <option value="salary">給与（パート・アルバイト等）</option>
                  <option value="pension">公的年金（老齢年金等）</option>
                </select>
              </label>
              <div className="field__inline">
                <label className="field__sublabel" htmlFor="spouse-income">
                  {form.spouseIncomeType === 'pension' ? '配偶者の年金収入（年額）' : '配偶者の給与収入'}
                </label>
                <NumberInput
                  id="spouse-income"
                  className="field__number"
                  value={form.spouseSalaryIncome}
                  max={100_000_000}
                  onChange={(v) => onChange({ spouseSalaryIncome: v })}
                />
                <span className="field__unit">円</span>
              </div>
              {form.spouseIncomeType === 'pension' && (
                <p className="field__note">
                  公的年金等の<strong>収入金額（年額・控除前）</strong>を入力してください。合計所得は公的年金等控除後で自動計算します。
                </p>
              )}
              {form.spouseIncomeType === 'pension' && !form.spouseElderly && (
                <label className="field__check field__check--small">
                  <input
                    type="checkbox"
                    checked={form.spousePensionOver65}
                    onChange={(e) => onChange({ spousePensionOver65: e.target.checked })}
                  />
                  配偶者が65歳以上（公的年金等控除が大きくなる）
                </label>
              )}
              <label className="field__check field__check--small">
                <input
                  type="checkbox"
                  checked={form.spouseElderly}
                  onChange={(e) => onChange({ spouseElderly: e.target.checked })}
                />
                70歳以上
              </label>
            </div>
          )}
        </div>

        {/* 扶養親族 */}
        <fieldset className="field">
          <legend className="field__label">扶養親族の人数</legend>
          <div className="field__grid">
            <CountField
              label="年少（16歳未満）"
              hint="控除なし・住民税の非課税判定に影響"
              value={form.depUnder16}
              onChange={(v) => onChange({ depUnder16: v })}
            />
            <CountField
              label="一般（16〜18・23〜69歳）"
              hint="控除38万円"
              value={form.depGeneral}
              onChange={(v) => onChange({ depGeneral: v })}
            />
            <CountField
              label="特定扶養（19〜22歳）"
              hint="子の合計所得が要件以下（給与のみなら令和7: 123万円/令和8〜: 136万円以下）。超える場合は特定親族欄へ"
              value={form.depSpecified}
              onChange={(v) => onChange({ depSpecified: v })}
            />
            <CountField
              label="老人・同居老親等（70歳以上）"
              hint="本人や配偶者の親と同居"
              value={form.depElderlyCoLiving}
              onChange={(v) => onChange({ depElderlyCoLiving: v })}
            />
            <CountField
              label="老人・同居以外（70歳以上）"
              hint="別居の親など"
              value={form.depElderlyOther}
              onChange={(v) => onChange({ depElderlyOther: v })}
            />
          </div>
          {/* 特定親族特別控除（令和7新設）。扶養控除の所得要件を超える19〜22歳の子の給与収入を1人ずつ入力。 */}
          <div className="field__sub">
            <p className="field__note">
              <strong>特定親族（19〜22歳・扶養控除の所得要件を超える子）</strong>の給与収入。
              バイト等の収入が要件を超えると特定扶養控除は外れますが、その子の給与収入を入力すると
              <strong>特定親族特別控除</strong>（令和7新設）で負担増をやわらげます。1人ずつ「＋」で追加してください。
            </p>
            {form.depSpecialRelativeSalaries.map((salary, i) => (
              <div className="field__inline" key={i}>
                <label className="field__sublabel" htmlFor={`special-relative-${i}`}>
                  特定親族の給与収入（{i + 1}人目）
                </label>
                <NumberInput
                  id={`special-relative-${i}`}
                  className="field__number"
                  ariaLabel={`特定親族の給与収入（${i + 1}人目）`}
                  value={salary}
                  max={10_000_000}
                  onChange={(v) =>
                    onChange({
                      depSpecialRelativeSalaries: form.depSpecialRelativeSalaries.map((s, idx) => (idx === i ? v : s)),
                    })
                  }
                />
                <span className="field__unit">円</span>
                <button
                  type="button"
                  className="childcare-period__remove"
                  onClick={() =>
                    onChange({ depSpecialRelativeSalaries: form.depSpecialRelativeSalaries.filter((_, idx) => idx !== i) })
                  }
                >
                  削除
                </button>
              </div>
            ))}
            <button
              type="button"
              className="childcare-add"
              onClick={() => onChange({ depSpecialRelativeSalaries: [...form.depSpecialRelativeSalaries, 0] })}
            >
              ＋ 特定親族を追加
            </button>
          </div>
        </fieldset>

        {/* 同一生計配偶者・扶養親族の障害者控除 */}
        <fieldset className="field">
          <legend className="field__label">同一生計配偶者・扶養親族の障害者</legend>
          <div className="field__grid">
            <CountField
              label="普通障害者"
              hint="控除27万円（住民税26万円）"
              value={form.familyDisabilityNormal}
              onChange={(v) => onChange({ familyDisabilityNormal: v })}
            />
            <CountField
              label="特別障害者（同居以外）"
              hint="控除40万円（住民税30万円）"
              value={form.familyDisabilitySpecial}
              onChange={(v) => onChange({ familyDisabilitySpecial: v })}
            />
            <CountField
              label="同居特別障害者"
              hint="本人・配偶者・親族と同居。控除75万円（住民税53万円）"
              value={form.familyDisabilityCoLivingSpecial}
              onChange={(v) => onChange({ familyDisabilityCoLivingSpecial: v })}
            />
          </div>
          <p className="field__note">
            障害者である配偶者（合計所得58万円以下）・扶養親族の人数を入力してください。障害者控除に所得の下限・上限はありません。
            本人が障害者の場合は「本人について」欄で選択します。
          </p>
        </fieldset>
      </fieldset>

      {/* ========== 詳細設定（任意） ========== */}
      <details className="form__advanced">
        <summary>詳細設定（対象年度: {eraLabel(form.taxYear)}）</summary>

        {/* 対象年度 */}
        <div className="field">
          <label className="field__label" htmlFor="tax-year">
            対象年度
            <span className="field__hint">税制ルールの年度</span>
          </label>
          <select
            id="tax-year"
            className="field__select"
            value={form.taxYear}
            onChange={(e) => onChange({ taxYear: Number(e.target.value) as TaxYear })}
          >
            {AVAILABLE_TAX_YEARS.map((y) => (
              <option key={y} value={y}>
                {eraLabel(y)}
                {getTaxTable(y).provisional ? '・暫定' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 健康保険の種類（実額タブは社保を実額オーバーライドするため健保種別は使わない＝非表示）。 */}
        {form.mode === 'employee' && !actual && (
          <>
            <div className="field">
              <label className="field__label" htmlFor="health-type">
                健康保険の種類
              </label>
              <select
                id="health-type"
                className="field__select"
                value={form.healthInsuranceType}
                onChange={(e) => onChange({ healthInsuranceType: e.target.value as 'kyokai' | 'kumiai' })}
              >
                <option value="kyokai">協会けんぽ（東京・標準）</option>
                <option value="kumiai">組合健保（料率を手入力）</option>
              </select>
            </div>
            {form.healthInsuranceType === 'kumiai' && (
              <>
                <p className="field__note">
                  給与明細や健保組合のサイトに記載の<strong>被保険者（本人）負担の保険料率</strong>を入力してください。
                  組合健保は事業主が折半より多く負担することが多く、協会けんぽより安い場合があります
                  （労使合計の料率しか分からない場合は半分が目安）。厚生年金・雇用保険は変わりません。
                </p>
                <RateField
                  id="kumiai-health"
                  label="健康保険料率（本人負担）"
                  value={form.kumiaiHealthRatePct}
                  max={20}
                  onCommit={(v) => onChange({ kumiaiHealthRatePct: v })}
                />
                {form.taxYear >= 2026 && (
                  <RateField
                    id="kumiai-child-support"
                    label="子ども・子育て支援金率（本人負担・令和8〜）"
                    value={form.kumiaiChildSupportRatePct}
                    max={5}
                    onCommit={(v) => onChange({ kumiaiChildSupportRatePct: v })}
                  />
                )}
                {form.age >= 40 && form.age <= 64 ? (
                  <RateField
                    id="kumiai-care"
                    label="介護保険料率（本人負担・40〜64歳）"
                    value={form.kumiaiCareRatePct}
                    max={10}
                    onCommit={(v) => onChange({ kumiaiCareRatePct: v })}
                  />
                ) : (
                  <p className="field__note">
                    現在の年齢（{form.age}歳）では介護保険料は加算されないため、介護保険料率の入力は不要です（介護保険は40〜64歳のみ）。
                  </p>
                )}
              </>
            )}
          </>
        )}

        {/* 住民税の自治体差（任意） */}
        <fieldset className="field">
          <legend className="field__label">住民税の自治体差（任意）</legend>
          <label className="selectfield" htmlFor="resident-grade">
            <span>お住まいの地域の区分（級地区分）— 住民税が非課税になる基準に影響。不明なら1級地のまま</span>
            <select
              id="resident-grade"
              className="field__select"
              value={form.residentGradeLevel}
              onChange={(e) => onChange({ residentGradeLevel: Number(e.target.value) as 1 | 2 | 3 })}
            >
              <option value={1}>1級地（東京23区・政令市など）</option>
              <option value={2}>2級地（中規模都市など）</option>
              <option value={3}>3級地（町村など）</option>
            </select>
          </label>
          <label className="selectfield" htmlFor="resident-percapita">
            <span>住民税の定額部分（均等割）— 市区町村＋都道府県分。森林環境税は除く</span>
            <span className="field__inline">
              <input
                id="resident-percapita"
                className="field__number field__number--narrow"
                type="number"
                min={0}
                max={20000}
                step={100}
                placeholder={String(getTaxTable(form.taxYear).residentTax.perCapita.total)}
                value={form.residentPerCapita ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  onChange({ residentPerCapita: v === '' ? null : Math.max(0, Math.min(20000, toNumber(v))) })
                }}
              />
              <span className="field__unit">円</span>
            </span>
          </label>
          <p className="field__note">
            未入力なら標準（均等割4,000円＋森林環境税1,000円＝5,000円）。超過課税の自治体（例: 横浜みどり税で市民税＋900円）は
            均等割（森林環境税を除く）を上書きしてください。級地区分は低所得時の非課税限度額の判定に影響します。
          </p>
        </fieldset>
      </details>
    </section>
  )
}

function CountField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint?: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label className="count">
      <span className="count__label">{label}</span>
      {hint && <span className="count__hint">{hint}</span>}
      <input
        className="count__input"
        type="number"
        min={0}
        max={20}
        placeholder="0"
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(Math.max(0, Math.min(20, toNumber(e.target.value))))}
      />
    </label>
  )
}

/** 料率(%)の入力。編集途中の空欄・小数点を許容し、確定（blur）時に 0〜max へ丸める。 */
function RateField({
  id,
  label,
  value,
  max,
  onCommit,
}: {
  id: string
  label: string
  value: number
  max: number
  onCommit: (v: number) => void
}) {
  const [text, setText] = useState(String(value))
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__inline">
        <input
          id={id}
          className="field__number field__number--narrow"
          type="number"
          min={0}
          max={max}
          step={0.01}
          value={text}
          onChange={(e) => {
            const t = e.target.value
            setText(t)
            const n = Number(t)
            if (t !== '' && Number.isFinite(n)) onCommit(Math.max(0, Math.min(max, n)))
          }}
          onBlur={() => {
            const n = Number(text)
            const clamped = Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0
            setText(String(clamped))
            onCommit(clamped)
          }}
        />
        <span className="field__unit">%</span>
      </div>
    </div>
  )
}
