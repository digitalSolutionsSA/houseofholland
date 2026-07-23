import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import './PageHeader.css'

type PageHeaderProps = {
  title: string
  subtitle?: string
  backTo?: string
  onBack?: () => void
  rightAction?: ReactNode
  leftAction?: ReactNode
  serif?: boolean
  align?: 'left' | 'center'
  goldTitle?: boolean
}

export function PageHeader({
  title,
  subtitle,
  backTo,
  onBack,
  rightAction,
  leftAction,
  serif = true,
  align = 'left',
  goldTitle = false,
}: PageHeaderProps) {
  const back = leftAction ? leftAction : backTo ? (
    <Link to={backTo} className="page-header__icon-btn" aria-label="Go back">
      <ChevronLeft size={24} strokeWidth={1.5} />
    </Link>
  ) : onBack ? (
    <button type="button" className="page-header__icon-btn" onClick={onBack} aria-label="Go back">
      <ChevronLeft size={24} strokeWidth={1.5} />
    </button>
  ) : null

  return (
    <header className={`page-header page-header--${align}`}>
      <div className="page-header__row">
        {back && <div className="page-header__side page-header__side--left">{back}</div>}
        <div className="page-header__titles">
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
          <h1
            className={`page-header__title ${serif ? 'page-header__title--serif' : ''} ${goldTitle ? 'page-header__title--gold' : ''}`}
          >
            {title}
          </h1>
        </div>
        <div className="page-header__side page-header__side--right">{rightAction}</div>
      </div>
    </header>
  )
}
