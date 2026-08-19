import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Users, Shirt, Zap, LayoutDashboard, ArrowLeft, CheckCircle,
  Images, CalendarDays, CalendarCheck, UserCheck, Bell, DollarSign,
  FileText, UserCog, GitBranch, Trophy, Menu, X, type LucideIcon,
} from 'lucide-react'
import { Logo } from '../../components/shared/Logo'
import { useAuth } from '../../context/AuthContext'
import './AdminLayout.css'


type NavLink = { to: string; label: string; icon: LucideIcon; end?: boolean }

const MANAGER_LINKS: NavLink[] = [
  { to: '/admin',               label: 'Dashboard',        icon: LayoutDashboard, end: true },
  { to: '/admin/bookings',      label: 'Appointments',     icon: CalendarCheck },
  { to: '/admin/schedule',      label: 'My Schedule',      icon: CalendarDays },
  { to: '/admin/completions',   label: 'Record Tattoo',    icon: CheckCircle },
  { to: '/admin/portfolio',     label: 'My Portfolio',     icon: Images },
  { to: '/admin/artist-profile',label: 'Artist Profile',   icon: UserCog },
  { to: '/admin/waivers',       label: 'Waivers',          icon: FileText },
  { to: '/admin/artists',       label: 'Artists',          icon: Users },
  { to: '/admin/guest-artists', label: 'Guest Artists',    icon: UserCheck },
  { to: '/admin/merch',         label: 'Merch',            icon: Shirt },
  { to: '/admin/flash',         label: 'Flash Events',     icon: Zap },
]

const SUPER_LINKS: NavLink[] = [
  { to: '/admin/rent',          label: 'Booth Rent',       icon: DollarSign },
  { to: '/admin/notifications', label: 'Notifications',    icon: Bell },
  { to: '/admin/points',        label: 'Client Points',    icon: Trophy },
]

const REFERRAL_EMAILS = ['info@digitalsolutionssa.co.za', 'armand@hohtattoos.com']

const ARTIST_LINKS: NavLink[] = [
  { to: '/admin/bookings',       label: 'Appointments',    icon: CalendarCheck },
  { to: '/admin/schedule',       label: 'My Schedule',     icon: CalendarDays },
  { to: '/admin/portfolio',      label: 'My Portfolio',    icon: Images },
  { to: '/admin/artist-profile', label: 'My Profile',      icon: UserCog },
  { to: '/admin/waivers',        label: 'Waivers',         icon: FileText },
]

export function AdminLayout() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isManager = profile?.role === 'manager'
  const isSuper = !!profile?.is_super_admin
  const canSeeReferrals = REFERRAL_EMAILS.includes((profile?.email ?? '').toLowerCase())
  const links = [
    ...(isManager ? MANAGER_LINKS : ARTIST_LINKS),
    ...(isSuper ? SUPER_LINKS : []),
    ...(canSeeReferrals ? [{ to: '/admin/referrals', label: 'Referrals', icon: GitBranch }] : []),
  ]

  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = (
    <>
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
          }
          onClick={() => setMenuOpen(false)}
        >
          <Icon size={18} strokeWidth={1.5} />
          <span>{label}</span>
        </NavLink>
      ))}
      {!isManager && (
        <button
          className="admin-sidebar__link"
          onClick={() => { navigate('/booth-rent'); setMenuOpen(false) }}
          style={{ border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
        >
          <DollarSign size={18} strokeWidth={1.5} />
          <span>Booth Rent</span>
        </button>
      )}
    </>
  )

  return (
    <>
    <div className="admin-shell">
      {/* ── Desktop sidebar ── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <Logo variant="full" height={72} />
          <span className="admin-sidebar__badge">{isManager ? 'Admin' : 'Artist'}</span>
        </div>
        <nav className="admin-sidebar__nav">{navLinks}</nav>
        <button className="admin-sidebar__back" onClick={() => navigate('/home')}>
          <ArrowLeft size={16} strokeWidth={1.5} />
          Back to App
        </button>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>

      {/* ── Mobile: floating menu button ── */}
      <button
        className="admin-fab"
        onClick={() => setMenuOpen(true)}
        aria-label="Open navigation"
      >
        <Menu size={20} strokeWidth={1.8} />
      </button>

      {/* ── Mobile: slide-in drawer ── */}
      {menuOpen && (
        <div className="admin-drawer-overlay" onClick={() => setMenuOpen(false)}>
          <div className="admin-drawer" onClick={e => e.stopPropagation()}>
            <div className="admin-drawer__head">
              <span className="admin-sidebar__badge" style={{ alignSelf: 'flex-start' }}>
                {isManager ? 'Admin' : 'Artist'}
              </span>
              <button className="admin-drawer__close" onClick={() => setMenuOpen(false)} aria-label="Close">
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            <nav className="admin-drawer__nav">{navLinks}</nav>
            <button
              className="admin-sidebar__back"
              style={{ marginTop: 'auto' }}
              onClick={() => { navigate('/home'); setMenuOpen(false) }}
            >
              <ArrowLeft size={16} strokeWidth={1.5} />
              Back to App
            </button>
          </div>
        </div>
      )}

    </div>
    </>
  )
}
