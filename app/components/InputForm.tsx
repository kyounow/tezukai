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

/** 額面年収スライダー／数値入力の上限（5,000万円）。両者を一致させる。 */
const SALARY_MAX = 50_000_000
/** スライダーの目盛り（ガイド）ラベル。 */
const SALARY_TICKS: { value: number; label: string }[] = [
  { value: 0, label: '0' },
  { value: 10_000_000, label: '1000万' },
  { value: 20_000_000, label: '2000万' },
  { value: 30_000_000, label: '3000万' },
  { value: 40_000_000, label: '4000万' },
  { value: 50_000_000, label: '5000万' },
]

export function InputForm({ form, onChange }: Props) {
  return (
    <section className="card form" aria-label="入力">
      <h2 className="card__heading">入力</h2>

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

      {form.mode === 'soleProprietor' && (
        <>
          <div className="field">
            <label className="field__label" htmlFor="bus-revenue">
              事業収入（売上）
            </label>
            <div className="field__inline">
              <NumberInput id="bus-revenue" className="field__number" ariaLabel="事業収入" value={form.busRevenue} max={1_000_000_000} onChange={(v) => onChange({ busRevenue: v })} />
              <span className="field__unit">円</span>
            </div>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="bus-expenses">
              必要経費
            </label>
            <div className="field__inline">
              <NumberInput id="bus-expenses" className="field__number" ariaLabel="必要経費" value={form.busExpenses} max={1_000_000_000} onChange={(v) => onChange({ busExpenses: v })} />
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
        </>
      )}

      {form.mode === 'employee' && (
        <>
      {/* 賞与分離モードの切替 */}
      <div className="field">
        <label className="field__check field__check--small">
          <input type="checkbox" checked={form.bonusMode} onChange={(e) => onChange({ bonusMode: e.target.checked })} />
          賞与を分けて社会保険料を精密に計算する
        </label>
      </div>

      {form.bonusMode ? (
        <>
          <div className="field">
            <label className="field__label" htmlFor="monthly-salary">
              月給（月額）
              <span className="field__hint">標準報酬月額の基礎</span>
            </label>
            <div className="field__inline">
              <NumberInput id="monthly-salary" className="field__number" ariaLabel="月給" value={form.monthlySalary} max={10_000_000} onChange={(v) => onChange({ monthlySalary: v })} />
              <span className="field__unit">円</span>
            </div>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="annual-bonus">
              年間賞与（合計）
            </label>
            <div className="field__inline">
              <NumberInput id="annual-bonus" className="field__number" ariaLabel="年間賞与" value={form.annualBonus} max={100_000_000} onChange={(v) => onChange({ annualBonus: v })} />
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
            max={SALARY_MAX}
            step={100_000}
            value={Math.min(form.salaryIncome, SALARY_MAX)}
            aria-valuetext={man(Math.min(form.salaryIncome, SALARY_MAX))}
            onChange={(e) => onChange({ salaryIncome: toNumber(e.target.value) })}
          />
          <div className="field__scale" aria-hidden="true">
            <div className="field__scale-inner">
              {SALARY_TICKS.map((t) => (
                <span
                  key={t.value}
                  className="field__scale-tick"
                  style={{ left: `${(t.value / SALARY_MAX) * 100}%` }}
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>
          <div className="field__inline">
            <NumberInput className="field__number" ariaLabel="額面年収（数値入力）" value={form.salaryIncome} max={SALARY_MAX} onChange={(v) => onChange({ salaryIncome: v })} />
            <span className="field__unit">円</span>
          </div>
        </div>
      )}

      {/* 健康保険の種類 */}
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
            <div className="field__inline">
              <label className="field__sublabel" htmlFor="spouse-income">
                配偶者の給与収入
              </label>
              <NumberInput
                id="spouse-income"
                className="field__number"
                ariaLabel="配偶者の給与収入"
                value={form.spouseSalaryIncome}
                max={100_000_000}
                onChange={(v) => onChange({ spouseSalaryIncome: v })}
              />
              <span className="field__unit">円</span>
            </div>
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
            hint="控除63万円"
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
      </fieldset>

      {/* 住民税の自治体差（任意） */}
      <fieldset className="field">
        <legend className="field__label">住民税の自治体差（任意）</legend>
        <label className="selectfield">
          <span>級地区分（非課税限度額）</span>
          <select
            className="field__select"
            value={form.residentGradeLevel}
            onChange={(e) => onChange({ residentGradeLevel: Number(e.target.value) as 1 | 2 | 3 })}
          >
            <option value={1}>1級地（東京23区・政令市など）</option>
            <option value={2}>2級地（中規模都市など）</option>
            <option value={3}>3級地（町村など）</option>
          </select>
        </label>
        <label className="selectfield">
          <span>均等割（市区町村＋都道府県・森林環境税を除く）</span>
          <span className="field__inline">
            <input
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
