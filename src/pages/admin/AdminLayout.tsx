import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Users, Shirt, Zap, LayoutDashboard, ArrowLeft, CheckCircle,
  Images, CalendarDays, CalendarCheck, UserCheck, Bell, DollarSign,
  FileText, UserCog, GitBranch, Trophy, type LucideIcon,
} from 'lucide-react'
import { Logo } from '../../components/shared/Logo'
import { BottomNav } from '../../components/shared/BottomNav'
import { BrandBackground } from '../../components/shared/BrandBackground'
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
  { to: '/admin/rent',          label: 'Booth Rent',       icon: DollarSign },
  { to: '/admin/notifications', label: 'Notifications',    icon: Bell },
  { to: '/admin/points',        label: 'Client Points',   icon: Trophy },
]

const REFERRAL_EMAILS = ['info@digitalsolutionssa.co.za', 'armandgroesbeek@gmail.com']

const ARTIST_LINKS: NavLink[] = [
  { to: '/admin/bookings',       label: 'Appointments',    icon: CalendarCheck },
  { to: '/admin/schedule',       label: 'My Schedule',     icon: CalendarDays },
  { to: '/admin/portfolio',      label: 'My Portfolio',    icon: Images },
  { to: '/admin/artist-profile', label: 'My Profile',      icon: UserCog },
  { to: '/admin/waivers',        label: 'Waivers',         icon: FileText },
  { to: '/admin/points',         label: 'Client Points',   icon: Trophy },
]

export function AdminLayout() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isManager = profile?.role === 'manager'
  const canSeeReferrals = REFERRAL_EMAILS.includes((profile?.email ?? '').toLowerCase())
  const links = [
    ...(isManager ? MANAGER_LINKS : ARTIST_LINKS),
    ...(canSeeReferrals ? [{ to: '/admin/referrals', label: 'Referrals', icon: GitBranch }] : []),
  ]

  return (
    <>
    <BrandBackground className="app-shell__marble" />
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <Logo variant="full" height={72} />
          <span className="admin-sidebar__badge">{isManager ? 'Admin' : 'Artist'}</span>
        </div>
        <nav className="admin-sidebar__nav">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
              }
            >
              <Icon size={18} strokeWidth={1.5} />
              <span>{label}</span>
            </NavLink>
          ))}
          {/* Artists get a link to the Booth Rent payment page in the main app */}
          {!isManager && (
            <button
              className="admin-sidebar__link"
              onClick={() => navigate('/booth-rent')}
              style={{ border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
            >
              <DollarSign size={18} strokeWidth={1.5} />
              <span>Booth Rent</span>
            </button>
          )}
        </nav>
        <button className="admin-sidebar__back" onClick={() => navigate('/home')}>
          <ArrowLeft size={16} strokeWidth={1.5} />
          Back to App
        </button>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
      {/* Renders only on mobile (≤767px) via BottomNav CSS */}
      <BottomNav />
    </div>
    </>
  )
}
