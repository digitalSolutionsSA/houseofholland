import { Link } from 'react-router-dom'
import { CalendarPlus, Flame, FilePen, Shirt } from 'lucide-react'
import './QuickActions.css'

const actions = [
  { to: '/bookings/select-time', label: 'Book Appointment', icon: CalendarPlus },
  { to: '/flash-queue', label: 'Flash Queue', icon: Flame },
  { to: '/consent', label: 'Consent Forms', icon: FilePen },
  { to: '/merch', label: 'Shop Merch', icon: Shirt, badge: true },
]

export function QuickActions() {
  return (
    <div className="quick-actions">
      {actions.map(({ to, label, icon: Icon, badge }) => (
        <Link key={to} to={to} className="quick-actions__item">
          <span className="quick-actions__icon-wrap">
            <Icon size={22} strokeWidth={1.5} />
            {badge && <span className="quick-actions__badge" aria-hidden />}
          </span>
          <span className="quick-actions__label">{label}</span>
        </Link>
      ))}
    </div>
  )
}
