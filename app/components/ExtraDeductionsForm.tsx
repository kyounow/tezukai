import type { HousingConstruction, HousingPerformance } from '@core/index'
import type { FormState } from '../state'
import { eraLabel } from '../format'
import { NumberInput } from './NumberInput'

interface Props {
  form: FormState
  onChange: (patch: Partial<FormState>) => void
}

function YenField({
  label,
  hint,
  value,
  onChange,
  allowNegative,
}: {
  label: string
  hint?: string
  value: number
  onChange: (v: number) => void
  allowNegative?: boolean
}) {
  return (
    <label className="yenfield">
      <span className="yenfield__label">
        {label}
        {hint && <span className="yenfield__hint">{hint}</span>}
      </span>
      <span className="field__inline">
        <NumberInput
          className="field__number"
          ariaLabel={label}
          value={value}
          max={1_000_000_000}
          allowNegative={allowNegative}
          onChange={onChange}
        />
        <span className="field__unit">円</span>
      </span>
    </label>
  )
}

const MOVE_IN_YEARS = [2022, 2023, 2024, 2025]
const CONSTRUCTIONS: { value: HousingConstruction; label: string }[] = [
  { value: 'new', label: '新築・買取再販' },
  { value: 'used', label: '中古（既存住宅）' },
]
const PERFORMANCES: { value: HousingPerformance; label: string }[] = [
  { value: 'certified', label: '認定住宅（長期優良・低炭素）' },
  { value: 'zeh', label: 'ZEH水準省エネ住宅' },
  { value: 'energySaving', label: '省エネ基準適合住宅' },
  { value: 'other', label: 'その他（省エネ基準なし）' },
]

export function ExtraDeductionsForm({ form, onChange }: Props) {
  return (
    <details className="card extra">
      <summary className="extra__summary">拡張控除（任意）— 医療費・生命保険・iDeCo・住宅ローン控除</summary>
      <div className="extra__body">
        {/* 医療費控除 */}
        <fieldset className="extra__group">
          <legend>医療費控除</legend>
          <YenField label="支払った医療費（年間）" value={form.medicalPaid} onChange={(v) => onChange({ medicalPaid: v })} />
          <YenField label="保険金等で補填される額" value={form.medicalReimbursed} onChange={(v) => onChange({ medicalReimbursed: v })} />
          <YenField
            label="セルフメディケーション対象薬の購入費"
            hint="通常の医療費控除と有利な方を自動採用"
            value={form.selfMedicationPaid}
            onChange={(v) => onChange({ selfMedicationPaid: v })}
          />
        </fieldset>

        {/* 生命保険料控除 */}
        <fieldset className="extra__group">
          <legend>生命保険料控除（年間支払保険料）</legend>
          <YenField label="一般生命保険料・新制度（H24以降契約）" value={form.lifeGeneralNew} onChange={(v) => onChange({ lifeGeneralNew: v })} />
          <YenField label="一般生命保険料・旧制度（H23以前契約）" value={form.lifeGeneralOld} onChange={(v) => onChange({ lifeGeneralOld: v })} />
          <YenField label="介護医療保険料（新制度のみ）" value={form.lifeNursingNew} onChange={(v) => onChange({ lifeNursingNew: v })} />
          <YenField label="個人年金保険料・新制度" value={form.lifePensionNew} onChange={(v) => onChange({ lifePensionNew: v })} />
          <YenField label="個人年金保険料・旧制度" value={form.lifePensionOld} onChange={(v) => onChange({ lifePensionOld: v })} />
        </fieldset>

        {/* iDeCo */}
        <fieldset className="extra__group">
          <legend>iDeCo・小規模企業共済等掛金</legend>
          <YenField label="年間掛金（全額が所得控除）" value={form.idecoAnnual} onChange={(v) => onChange({ idecoAnnual: v })} />
        </fieldset>

        {/* 住宅ローン控除 */}
        <fieldset className="extra__group">
          <legend>住宅ローン控除（現行制度・令和4〜7入居）</legend>
          <label className="field__check field__check--small">
            <input type="checkbox" checked={form.housingEnabled} onChange={(e) => onChange({ housingEnabled: e.target.checked })} />
            住宅ローン控除を適用する
          </label>
          {form.housingEnabled && (
            <div className="extra__housing">
              <label className="selectfield">
                <span>居住開始年</span>
                <select className="field__select" value={form.housingMoveInYear} onChange={(e) => onChange({ housingMoveInYear: Number(e.target.value) })}>
                  {MOVE_IN_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {eraLabel(y)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="selectfield">
                <span>取得区分</span>
                <select
                  className="field__select"
                  value={form.housingConstruction}
                  onChange={(e) => onChange({ housingConstruction: e.target.value as HousingConstruction })}
                >
                  {CONSTRUCTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="selectfield">
                <span>住宅の性能区分</span>
                <select
                  className="field__select"
                  value={form.housingPerformance}
                  onChange={(e) => onChange({ housingPerformance: e.target.value as HousingPerformance })}
                >
                  {PERFORMANCES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              {form.housingConstruction === 'new' && (form.housingMoveInYear === 2024 || form.housingMoveInYear === 2025) && (
                <label className="field__check field__check--small">
                  <input type="checkbox" checked={form.housingChildcare} onChange={(e) => onChange({ housingChildcare: e.target.checked })} />
                  子育て世帯・若者夫婦世帯（借入限度額の上乗せ）
                </label>
              )}
              <YenField label="年末の住宅ローン残高" value={form.housingBalance} onChange={(v) => onChange({ housingBalance: v })} />
              <p className="extra__note">
                ※ 借入限度額・控除期間は居住年と住宅区分で決まります（控除率0.7%）。合計所得2,000万円以下・床面積50㎡以上が要件。
                令和6・7入居の新築「その他（省エネ基準なし）」は原則対象外です。
              </p>
            </div>
          )}
        </fieldset>

        {/* 給与以外の所得 */}
        <fieldset className="extra__group">
          <legend>給与以外の所得（総合課税）</legend>
          <p className="extra__note">
            損失（赤字）はマイナスで入力できます（損益通算できるのは事業・不動産の損失のみ）。
            <strong>分離課税（上場株式等・土地建物の譲渡、申告分離課税の配当・利子など）は対象外です。</strong>
          </p>
          <YenField label="事業所得" hint="損失は通算可（マイナス可）" value={form.otherBusiness} allowNegative onChange={(v) => onChange({ otherBusiness: v })} />
          <YenField label="不動産所得" hint="損失は通算可（マイナス可）" value={form.otherRealEstate} allowNegative onChange={(v) => onChange({ otherRealEstate: v })} />
          <YenField label="雑所得（その他）" value={form.otherMisc} onChange={(v) => onChange({ otherMisc: v })} />
          <YenField label="配当所得（総合課税分）" value={form.otherDividend} onChange={(v) => onChange({ otherDividend: v })} />
          <YenField label="一時所得（特別控除50万円後・1/2前）" value={form.otherTemporary} onChange={(v) => onChange({ otherTemporary: v })} />
          <YenField label="総合譲渡・短期" value={form.otherShortCapital} onChange={(v) => onChange({ otherShortCapital: v })} />
          <YenField label="総合譲渡・長期（1/2前）" value={form.otherLongCapital} onChange={(v) => onChange({ otherLongCapital: v })} />
        </fieldset>

        {/* 所得金額調整控除 */}
        <fieldset className="extra__group">
          <legend>所得金額調整控除（給与収入850万円超）</legend>
          <p className="extra__note">給与収入が850万円超で、次のいずれかに該当すると給与所得から最大15万円が控除されます。</p>
          <label className="field__check field__check--small">
            <input type="checkbox" checked={form.adjYoungDependent} onChange={(e) => onChange({ adjYoungDependent: e.target.checked })} />
            23歳未満の扶養親族がいる
          </label>
          <label className="field__check field__check--small">
            <input type="checkbox" checked={form.adjSelfDisability} onChange={(e) => onChange({ adjSelfDisability: e.target.checked })} />
            本人が特別障害者
          </label>
          <label className="field__check field__check--small">
            <input type="checkbox" checked={form.adjFamilyDisability} onChange={(e) => onChange({ adjFamilyDisability: e.target.checked })} />
            特別障害者である同一生計配偶者・扶養親族がいる
          </label>
        </fieldset>
      </div>
    </details>
  )
}
