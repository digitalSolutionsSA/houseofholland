import { NavLink } from 'react-router-dom'
import {
  Home,
  Users,
  CalendarDays,
  Archive,
  User,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import './BottomNav.css'

const items = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/artists', label: 'Artists', icon: Users },
  { to: '/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/vault', label: 'Vault', icon: Archive },
  { to: '/profile', label: 'Profile', icon: User },
] as const

export function BottomNav() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'manager' || profile?.role === 'artist'

  return (
    <nav className="bottom-nav" aria-label="Main">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`
          }
        >
          <span className="bottom-nav__indicator" aria-hidden />
          <Icon size={22} strokeWidth={1.5} />
          <span className="bottom-nav__label">{label}</span>
        </NavLink>
      ))}
      {isAdmin && (
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`
          }
        >
          <span className="bottom-nav__indicator" aria-hidden />
          <ShieldCheck size={22} strokeWidth={1.5} />
          <span className="bottom-nav__label">Admin</span>
        </NavLink>
      )}
    </nav>
  )
}
