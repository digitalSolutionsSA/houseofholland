import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Users, Shirt, Zap, LayoutDashboard, ArrowLeft, CheckCircle, Images, CalendarDays, CalendarCheck, UserCheck, Bell, DollarSign } from 'lucide-react'
import { Logo } from '../../components/shared/Logo'
import './AdminLayout.css'

const links = [
  { to: '/admin',                  label: 'Dashboard',       icon: LayoutDashboard, end: true },
  { to: '/admin/bookings',         label: 'Appointments',    icon: CalendarCheck },
  { to: '/admin/schedule',         label: 'My Schedule',     icon: CalendarDays },
  { to: '/admin/completions',      label: 'Record Tattoo',   icon: CheckCircle },
  { to: '/admin/portfolio',        label: 'My Portfolio',    icon: Images },
  { to: '/admin/artists',          label: 'Artists',         icon: Users },
  { to: '/admin/guest-artists',    label: 'Guest Artists',   icon: UserCheck },
  { to: '/admin/merch',            label: 'Merch',           icon: Shirt },
  { to: '/admin/flash',            label: 'Flash Events',    icon: Zap },
  { to: '/admin/rent',             label: 'Booth Rent',      icon: DollarSign },
  { to: '/admin/notifications',    label: 'Notifications',   icon: Bell },
]

export function AdminLayout() {
  const navigate = useNavigate()
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <Logo variant="full" height={72} />
          <span className="admin-sidebar__badge">Admin</span>
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
        </nav>
        <button className="admin-sidebar__back" onClick={() => navigate('/home')}>
          <ArrowLeft size={16} strokeWidth={1.5} />
          Back to App
        </button>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
