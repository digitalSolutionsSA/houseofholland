import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/shared/AppLayout'
import { AdminLayout } from './pages/admin/AdminLayout'
import { useAuth } from './context/AuthContext'
import { usePushNotifications } from './hooks/usePushNotifications'

// Eagerly loaded — structural, always needed
const OverviewPage        = lazy(() => import('./pages/OverviewPage').then(m        => ({ default: m.OverviewPage })))
const LoginPage           = lazy(() => import('./pages/LoginPage').then(m           => ({ default: m.LoginPage })))
const HomePage            = lazy(() => import('./pages/HomePage').then(m            => ({ default: m.HomePage })))

// Customer pages — lazy loaded
const ArtistsPage         = lazy(() => import('./pages/ArtistsPage').then(m         => ({ default: m.ArtistsPage })))
const ArtistProfilePage   = lazy(() => import('./pages/ArtistProfilePage').then(m   => ({ default: m.ArtistProfilePage })))
const VaultPage           = lazy(() => import('./pages/VaultPage').then(m           => ({ default: m.VaultPage })))
const MerchPage           = lazy(() => import('./pages/MerchPage').then(m           => ({ default: m.MerchPage })))
const ConsentFormsPage    = lazy(() => import('./pages/ConsentFormsPage').then(m    => ({ default: m.ConsentFormsPage })))
const PassportPage        = lazy(() => import('./pages/PassportPage').then(m        => ({ default: m.PassportPage })))
const MembershipPage      = lazy(() => import('./pages/MembershipPage').then(m      => ({ default: m.MembershipPage })))
const SelectDateTimePage  = lazy(() => import('./pages/SelectDateTimePage').then(m  => ({ default: m.SelectDateTimePage })))
const CheckInPage         = lazy(() => import('./pages/CheckInPage').then(m         => ({ default: m.CheckInPage })))
const FlashQueuePage      = lazy(() => import('./pages/FlashQueuePage').then(m      => ({ default: m.FlashQueuePage })))
const BookingsPage        = lazy(() => import('./pages/BookingsPage').then(m        => ({ default: m.BookingsPage })))
const ProfilePage         = lazy(() => import('./pages/ProfilePage').then(m         => ({ default: m.ProfilePage })))
const BattlePassPage      = lazy(() => import('./pages/BattlePassPage').then(m      => ({ default: m.BattlePassPage })))
const BoothRentPage       = lazy(() => import('./pages/BoothRentPage').then(m       => ({ default: m.BoothRentPage })))
const MessagesPage        = lazy(() => import('./pages/MessagesPage').then(m        => ({ default: m.MessagesPage })))
const ChatPage            = lazy(() => import('./pages/ChatPage').then(m            => ({ default: m.ChatPage })))

// Admin pages — lazy loaded (only artists/managers ever download these)
const AdminDashboard      = lazy(() => import('./pages/admin/AdminDashboard').then(m      => ({ default: m.AdminDashboard })))
const AdminCompletions    = lazy(() => import('./pages/admin/AdminCompletions').then(m    => ({ default: m.AdminCompletions })))
const AdminBookings       = lazy(() => import('./pages/admin/AdminBookings').then(m       => ({ default: m.AdminBookings })))
const AdminSchedule       = lazy(() => import('./pages/admin/AdminSchedule').then(m       => ({ default: m.AdminSchedule })))
const AdminPortfolio      = lazy(() => import('./pages/admin/AdminPortfolio').then(m      => ({ default: m.AdminPortfolio })))
const AdminArtists        = lazy(() => import('./pages/admin/AdminArtists').then(m        => ({ default: m.AdminArtists })))
const AdminMerch          = lazy(() => import('./pages/admin/AdminMerch').then(m          => ({ default: m.AdminMerch })))
const AdminFlash          = lazy(() => import('./pages/admin/AdminFlash').then(m          => ({ default: m.AdminFlash })))
const AdminGuestArtists   = lazy(() => import('./pages/admin/AdminGuestArtists').then(m   => ({ default: m.AdminGuestArtists })))
const AdminNotifications  = lazy(() => import('./pages/admin/AdminNotifications').then(m  => ({ default: m.AdminNotifications })))
const AdminRent           = lazy(() => import('./pages/admin/AdminRent').then(m           => ({ default: m.AdminRent })))
const AdminWaivers        = lazy(() => import('./pages/admin/AdminWaivers').then(m        => ({ default: m.AdminWaivers })))
const AdminArtistProfile  = lazy(() => import('./pages/admin/AdminArtistProfile').then(m  => ({ default: m.AdminArtistProfile })))
const AdminReferrals      = lazy(() => import('./pages/admin/AdminReferrals').then(m      => ({ default: m.AdminReferrals })))
const AdminPoints         = lazy(() => import('./pages/admin/AdminPoints').then(m         => ({ default: m.AdminPoints })))

function PushInit() {
  const { user } = useAuth()
  usePushNotifications(user?.id ?? null)
  return null
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth()
  if (loading) return null
  if (!session) return <Navigate to="/login" replace />
  if (profile && profile.role !== 'manager' && profile.role !== 'artist') return <Navigate to="/home" replace />
  return <>{children}</>
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/home" replace />
  return <>{children}</>
}

// Minimal blank placeholder while page chunks load
function PageLoader() {
  return <div style={{ flex: 1, minHeight: '60vh' }} />
}

export default function App() {
  return (
    <BrowserRouter>
      <PushInit />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Admin portal — own layout, no app shell */}
          <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
            <Route index                  element={<AdminDashboard />} />
            <Route path="completions"     element={<AdminCompletions />} />
            <Route path="bookings"        element={<AdminBookings />} />
            <Route path="schedule"        element={<AdminSchedule />} />
            <Route path="portfolio"       element={<AdminPortfolio />} />
            <Route path="artists"         element={<AdminArtists />} />
            <Route path="merch"           element={<AdminMerch />} />
            <Route path="flash"           element={<AdminFlash />} />
            <Route path="guest-artists"   element={<AdminGuestArtists />} />
            <Route path="notifications"   element={<AdminNotifications />} />
            <Route path="rent"            element={<AdminRent />} />
            <Route path="waivers"         element={<AdminWaivers />} />
            <Route path="artist-profile"  element={<AdminArtistProfile />} />
            <Route path="referrals"       element={<AdminReferrals />} />
            <Route path="points"          element={<AdminPoints />} />
          </Route>

          {/* Public app */}
          <Route element={<AppLayout />}>
            <Route path="/"    element={<RedirectIfAuthed><OverviewPage /></RedirectIfAuthed>} />
            <Route path="/login" element={<RedirectIfAuthed><LoginPage /></RedirectIfAuthed>} />

            <Route path="/home"                            element={<RequireAuth><HomePage /></RequireAuth>} />
            <Route path="/artists"                         element={<RequireAuth><ArtistsPage /></RequireAuth>} />
            <Route path="/artists/:artistId"               element={<RequireAuth><ArtistProfilePage /></RequireAuth>} />
            <Route path="/vault"                           element={<RequireAuth><VaultPage /></RequireAuth>} />
            <Route path="/merch"                           element={<RequireAuth><MerchPage /></RequireAuth>} />
            <Route path="/consent"                         element={<RequireAuth><ConsentFormsPage /></RequireAuth>} />
            <Route path="/passport"                        element={<RequireAuth><PassportPage /></RequireAuth>} />
            <Route path="/battle-pass"                     element={<RequireAuth><BattlePassPage /></RequireAuth>} />
            <Route path="/membership"                      element={<RequireAuth><MembershipPage /></RequireAuth>} />
            <Route path="/bookings"                        element={<RequireAuth><BookingsPage /></RequireAuth>} />
            <Route path="/bookings/select-time"            element={<RequireAuth><SelectDateTimePage /></RequireAuth>} />
            <Route path="/bookings/checkin/:bookingId"     element={<RequireAuth><CheckInPage /></RequireAuth>} />
            <Route path="/flash-queue/:eventId"            element={<RequireAuth><FlashQueuePage /></RequireAuth>} />
            <Route path="/flash-queue"                     element={<RequireAuth><FlashQueuePage /></RequireAuth>} />
            <Route path="/profile"                         element={<RequireAuth><ProfilePage /></RequireAuth>} />
            <Route path="/booth-rent"                      element={<RequireAuth><BoothRentPage /></RequireAuth>} />
            <Route path="/messages"                        element={<RequireAuth><MessagesPage /></RequireAuth>} />
            <Route path="/messages/:conversationId"        element={<RequireAuth><ChatPage /></RequireAuth>} />
            <Route path="/settings"  element={<Navigate to="/profile" replace />} />
            <Route path="*"          element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
