import { useState } from 'react'
import { TATTOO_STYLES, isPredefined } from '../../lib/tattooStyles'
import './StylePicker.css'

type Props = {
  value: string[]
  onChange: (v: string[]) => void
}

function build(sel: Set<string>, other: boolean, custs: [string, string, string]): string[] {
  const result = [...sel]
  if (other) custs.forEach(c => { if (c.trim()) result.push(c.trim()) })
  return result
}

export function StylePicker({ value, onChange }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(value.filter(isPredefined))
  )
  const [hasOther, setHasOther] = useState(
    () => value.some(v => !isPredefined(v))
  )
  const [customs, setCustoms] = useState<[string, string, string]>(() => {
    const others = value.filter(v => !isPredefined(v))
    return [others[0] ?? '', others[1] ?? '', others[2] ?? '']
  })

  function toggle(style: string) {
    const next = new Set(selected)
    if (next.has(style)) next.delete(style)
    else next.add(style)
    setSelected(next)
    onChange(build(next, hasOther, customs))
  }

  function toggleOther() {
    const next = !hasOther
    setHasOther(next)
    onChange(build(selected, next, customs))
  }

  function setCustom(i: 0 | 1 | 2, val: string) {
    const next = [...customs] as [string, string, string]
    next[i] = val
    setCustoms(next)
    onChange(build(selected, hasOther, next))
  }

  return (
    <div className="style-picker">
      <div className="style-picker__grid">
        {TATTOO_STYLES.map(s => (
          <button
            key={s}
            type="button"
            className={`style-picker__pill${selected.has(s) ? ' style-picker__pill--on' : ''}`}
            onClick={() => toggle(s)}
          >
            {s}
          </button>
        ))}
        <button
          type="button"
          className={`style-picker__pill${hasOther ? ' style-picker__pill--on' : ''}`}
          onClick={toggleOther}
        >
          Other
        </button>
      </div>

      {hasOther && (
        <div className="style-picker__customs">
          <p className="style-picker__customs-hint">Add up to 3 custom styles:</p>
          {([0, 1, 2] as const).map(i => (
            <input
              key={i}
              className="admin-modal__input"
              value={customs[i]}
              placeholder={`Custom style ${i + 1}…`}
              maxLength={40}
              onChange={e => setCustom(i, e.target.value)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
