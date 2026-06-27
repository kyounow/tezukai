import type { FormState } from '../state'
import { man } from '../format'

interface Props {
  form: FormState
  onChange: (patch: Partial<FormState>) => void
}

function toNumber(value: string): number {
  const n = Number(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function InputForm({ form, onChange }: Props) {
  return (
    <section className="card form" aria-label="入力">
      <h2 className="card__heading">入力</h2>

      {/* 年収 */}
      <div className="field">
        <label className="field__label" htmlFor="salary">
          額面年収
          <span className="field__hint">{man(form.salaryIncome)}</span>
        </label>
        <input
          id="salary"
          className="field__range"
          type="range"
          min={0}
          max={20_000_000}
          step={100_000}
          value={form.salaryIncome}
          onChange={(e) => onChange({ salaryIncome: toNumber(e.target.value) })}
        />
        <div className="field__inline">
          <input
            className="field__number"
            type="number"
            min={0}
            step={10_000}
            value={form.salaryIncome}
            onChange={(e) => onChange({ salaryIncome: Math.max(0, toNumber(e.target.value)) })}
          />
          <span className="field__unit">円</span>
        </div>
      </div>

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
              <input
                id="spouse-income"
                className="field__number"
                type="number"
                min={0}
                step={10_000}
                value={form.spouseSalaryIncome}
                onChange={(e) => onChange({ spouseSalaryIncome: Math.max(0, toNumber(e.target.value)) })}
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
      <div className="field">
        <span className="field__label">扶養親族の人数</span>
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
      </div>
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
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(20, toNumber(e.target.value))))}
      />
    </label>
  )
}
