import { useState } from 'react'
import { TATTOO_STYLES, isPredefined } from '../../lib/tattooStyles'

type Props = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}

export function StyleSelect({ value, onChange, placeholder = 'Select style…', className }: Props) {
  // If the current value is a non-empty non-predefined string, we're in "Other" mode
  const isCustom = value !== '' && !isPredefined(value)
  const [showOther, setShowOther] = useState(isCustom)

  const dropdownVal = showOther || isCustom ? '__other__' : value

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === '__other__') {
      setShowOther(true)
      onChange('')
    } else {
      setShowOther(false)
      onChange(e.target.value)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <select
        className={className ?? 'admin-modal__select'}
        value={dropdownVal}
        onChange={handleSelect}
      >
        <option value="">{placeholder}</option>
        {TATTOO_STYLES.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
        <option value="__other__">Other</option>
      </select>

      {(showOther || isCustom) && (
        <input
          className="admin-modal__input"
          value={value}
          placeholder="Describe the style…"
          maxLength={60}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  )
}
