interface Props {
  value: number
  onChange: (v: number) => void
  className?: string
  id?: string
  ariaLabel?: string
  /** 上限（桁あふれ防止）。 */
  max?: number
}

/**
 * 3桁カンマ区切りで表示する数値入力。type=text + inputmode=numeric で
 * カンマ表示しつつ、変更時は数字のみを取り出して数値で返す。
 */
export function NumberInput({ value, onChange, className, id, ariaLabel, max }: Props) {
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      className={className}
      aria-label={ariaLabel}
      placeholder="0"
      value={value === 0 ? '' : value.toLocaleString('ja-JP')}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^0-9]/g, '')
        let next = digits === '' ? 0 : Number(digits)
        if (max !== undefined && next > max) next = max
        onChange(next)
      }}
    />
  )
}
