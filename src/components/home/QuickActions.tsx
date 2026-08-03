import { Link } from 'react-router-dom'
import { CalendarPlus, Flame, FilePen, Shirt } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import './QuickActions.css'

const allActions = [
  { to: '/bookings/select-time', label: 'Book Appointment', icon: CalendarPlus, artistOnly: false, hideForArtist: true },
  { to: '/flash-queue', label: 'Flash Queue', icon: Flame, hideForArtist: false },
  { to: '/consent', label: 'Consent Forms', icon: FilePen, hideForArtist: false },
  { to: '/merch', label: 'Shop Merch', icon: Shirt, badge: true, hideForArtist: false },
]

export function QuickActions() {
  const { profile } = useAuth()
  const isArtist = profile?.role === 'artist' || profile?.role === 'manager'
  const actions = allActions.filter(a => !(isArtist && a.hideForArtist))

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
