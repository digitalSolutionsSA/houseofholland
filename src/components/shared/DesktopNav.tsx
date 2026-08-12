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
  Trophy,
} from 'lucide-react'
import { Logo } from './Logo'
import { useAuth } from '../../context/AuthContext'
import './DesktopNav.css'

const CUSTOMER_PRIMARY = [
  { to: '/home',     label: 'Home',     icon: Home },
  { to: '/artists',  label: 'Artists',  icon: Users },
  { to: '/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/vault',    label: 'Vault',    icon: Archive },
  { to: '/merch',    label: 'Merch',    icon: Shirt },
  { to: '/profile',  label: 'Profile',  icon: User },
]

const CUSTOMER_SECONDARY = [
  { to: '/passport',    label: 'Passport',    icon: Award },
  { to: '/battle-pass', label: 'Battle Pass', icon: Trophy },
  { to: '/membership',  label: 'Membership',  icon: CreditCard },
]

const ARTIST_PRIMARY = [
  { to: '/home',     label: 'Home',       icon: Home },
  { to: '/artists',  label: 'Artists',    icon: Users },
  { to: '/membership', label: 'Membership', icon: CreditCard },
  { to: '/profile',  label: 'Profile',    icon: User },
]

export function DesktopNav() {
  const { profile } = useAuth()
  const isArtist = profile?.role === 'manager' || profile?.role === 'artist'

  const primary   = isArtist ? ARTIST_PRIMARY   : CUSTOMER_PRIMARY
  const secondary = isArtist ? []               : CUSTOMER_SECONDARY

  return (
    <aside className="desktop-nav" aria-label="Main">
      <div className="desktop-nav__brand">
        <Logo variant="full" height={110} />
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

      {isArtist && (
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

      {secondary.length > 0 && (
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
      )}
    </aside>
  )
}
