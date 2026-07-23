import './CategoryChips.css'

type CategoryChipsProps = {
  items: readonly string[]
  active: string
  onChange: (value: string) => void
}

export function CategoryChips({ items, active, onChange }: CategoryChipsProps) {
  return (
    <div className="category-chips" role="tablist">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={active === item}
          className={`category-chips__chip ${active === item ? 'category-chips__chip--active' : ''}`}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  )
}
