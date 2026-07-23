import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { DesktopNav } from './DesktopNav'
import { BrandBackground } from './BrandBackground'

const AUTH_ROUTES = ['/', '/login']

const HIDE_MOBILE_NAV = [
  '/',
  '/login',
  '/consent',
  '/passport',
  '/membership',
  '/bookings/select-time',
]

export function AppLayout() {
  const { pathname } = useLocation()
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
