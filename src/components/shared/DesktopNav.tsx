import { NavLink } from 'react-router-dom'
import {
  Home,
  Users,
  CalendarDays,
  Archive,
  User,
  Shirt,
  Award,
  CreditCard,
  ShieldCheck,
} from 'lucide-react'
import { Logo } from './Logo'
import { useAuth } from '../../context/AuthContext'
import './DesktopNav.css'

const primary = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/artists', label: 'Artists', icon: Users },
  { to: '/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/vault', label: 'Vault', icon: Archive },
  { to: '/merch', label: 'Merch', icon: Shirt },
  { to: '/profile', label: 'Profile', icon: User },
] as const

const secondary = [
  { to: '/passport', label: 'Passport', icon: Award },
  { to: '/membership', label: 'Membership', icon: CreditCard },
] as const

export function DesktopNav() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'manager' || profile?.role === 'artist'

  return (
    <aside className="desktop-nav" aria-label="Main">
      <div className="desktop-nav__brand">
        <Logo variant="full" height={88} />
      </div>

      <nav className="desktop-nav__links">
        {primary.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `desktop-nav__link ${isActive ? 'desktop-nav__link--active' : ''}`
            }
          >
            <Icon size={20} strokeWidth={1.5} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {isAdmin && (
        <div className="desktop-nav__section">
          <p className="desktop-nav__section-label">Admin</p>
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `desktop-nav__link ${isActive ? 'desktop-nav__link--active' : ''}`
            }
          >
            <ShieldCheck size={20} strokeWidth={1.5} />
            <span>Admin Portal</span>
          </NavLink>
        </div>
      )}

      <div className="desktop-nav__section">
        <p className="desktop-nav__section-label">Rewards</p>
        {secondary.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `desktop-nav__link ${isActive ? 'desktop-nav__link--active' : ''}`
            }
          >
            <Icon size={20} strokeWidth={1.5} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </aside>
  )
}
