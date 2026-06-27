interface Props {
  value: number
  onChange: (v: number) => void
  className?: string
  id?: string
  ariaLabel?: string
  /** 上限（桁あふれ防止）。 */
  max?: number
  /** 損失などマイナス入力を許可する。 */
  allowNegative?: boolean
}

/**
 * 3桁カンマ区切りで表示する数値入力。type=text + inputmode=numeric で
 * カンマ表示しつつ、変更時は数字のみを取り出して数値で返す。
 */
export function NumberInput({ value, onChange, className, id, ariaLabel, max, allowNegative }: Props) {
  return (
    <input
      id={id}
      type="text"
      inputMode={allowNegative ? 'text' : 'numeric'}
      className={className}
      aria-label={ariaLabel}
      placeholder="0"
      value={value === 0 ? '' : value.toLocaleString('ja-JP')}
      onChange={(e) => {
        const raw = e.target.value
        const negative = allowNegative && raw.trim().startsWith('-')
        const digits = raw.replace(/[^0-9]/g, '')
        let magnitude = digits === '' ? 0 : Number(digits)
        if (max !== undefined && magnitude > max) magnitude = max
        onChange(negative ? -magnitude : magnitude)
      }}
    />
  )
}
