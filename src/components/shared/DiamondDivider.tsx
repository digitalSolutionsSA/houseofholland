import './DiamondDivider.css'

type DiamondDividerProps = {
  className?: string
}

export function DiamondDivider({ className = '' }: DiamondDividerProps) {
  return (
    <div className={`diamond-divider ${className}`} aria-hidden>
      <span className="diamond-divider__line" />
      <span className="diamond-divider__diamond" />
      <span className="diamond-divider__line" />
    </div>
  )
}
