import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { DesktopNav } from './DesktopNav'
import { BrandBackground } from './BrandBackground'
import { useAuth } from '../../context/AuthContext'
import { useMembership } from '../../hooks/useMembership'

const AUTH_ROUTES = ['/', '/login']

const HIDE_MOBILE_NAV = [
  '/',
  '/login',
  '/consent',
  '/passport',
  '/bookings/select-time',
]

export function AppLayout() {
  const { pathname } = useLocation()
  const { profile } = useAuth()
  const { tier } = useMembership()

  // Apply colour theme to <html> so all CSS [data-tier] selectors work.
  // Staff can override via the demo picker (stored in localStorage).
  useEffect(() => {
    if (!profile) return
    const isStaff = profile.role === 'artist' || profile.role === 'manager'
    if (isStaff) {
      const saved = (localStorage.getItem('hoh_demo_tier') ?? 'black-card')
      document.documentElement.dataset.tier = saved
    } else {
      document.documentElement.dataset.tier = tier
    }
  }, [tier, profile])

  const isAuth = AUTH_ROUTES.includes(pathname)
  const showMobileNav = !HIDE_MOBILE_NAV.includes(pathname)
  const showDesktopNav = !isAuth

  return (
    <div className="app-shell">
      <BrandBackground className="app-shell__marble" vignette />
      <div className={`app-frame ${isAuth ? 'app-frame--auth' : ''}`}>
        {showDesktopNav && <DesktopNav />}
        <div className="app-main">
          <Outlet />
          {showMobileNav && <BottomNav />}
        </div>
      </div>
    </div>
  )
}
