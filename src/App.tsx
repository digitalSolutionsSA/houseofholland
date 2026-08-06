import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/shared/AppLayout'
import { OverviewPage } from './pages/OverviewPage'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { ArtistsPage } from './pages/ArtistsPage'
import { ArtistProfilePage } from './pages/ArtistProfilePage'
import { VaultPage } from './pages/VaultPage'
import { MerchPage } from './pages/MerchPage'
import { ConsentFormsPage } from './pages/ConsentFormsPage'
import { PassportPage } from './pages/PassportPage'
import { MembershipPage } from './pages/MembershipPage'
import { SelectDateTimePage } from './pages/SelectDateTimePage'
import { CheckInPage } from './pages/CheckInPage'
import { FlashQueuePage } from './pages/FlashQueuePage'
import { BookingsPage } from './pages/BookingsPage'
import { ProfilePage } from './pages/ProfilePage'
import { AdminLayout } from './pages/admin/AdminLayout'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminArtists } from './pages/admin/AdminArtists'
import { AdminMerch } from './pages/admin/AdminMerch'
import { AdminFlash } from './pages/admin/AdminFlash'
import { AdminCompletions } from './pages/admin/AdminCompletions'
import { AdminPortfolio } from './pages/admin/AdminPortfolio'
import { AdminSchedule } from './pages/admin/AdminSchedule'
import { AdminBookings } from './pages/admin/AdminBookings'
import { AdminGuestArtists } from './pages/admin/AdminGuestArtists'
import { AdminNotifications } from './pages/admin/AdminNotifications'
import { AdminRent } from './pages/admin/AdminRent'
import { AdminWaivers } from './pages/admin/AdminWaivers'
import { AdminArtistProfile } from './pages/admin/AdminArtistProfile'
import { AdminReferrals } from './pages/admin/AdminReferrals'
import { BoothRentPage } from './pages/BoothRentPage'
import { useAuth } from './context/AuthContext'

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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin portal — own layout, no app shell */}
        <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<AdminDashboard />} />
          <Route path="completions" element={<AdminCompletions />} />
          <Route path="bookings"   element={<AdminBookings />} />
          <Route path="schedule"   element={<AdminSchedule />} />
          <Route path="portfolio"  element={<AdminPortfolio />} />
          <Route path="artists" element={<AdminArtists />} />
          <Route path="merch"          element={<AdminMerch />} />
          <Route path="flash"          element={<AdminFlash />} />
          <Route path="guest-artists"  element={<AdminGuestArtists />} />
          <Route path="notifications"    element={<AdminNotifications />} />
          <Route path="rent"             element={<AdminRent />} />
          <Route path="waivers"          element={<AdminWaivers />} />
          <Route path="artist-profile"   element={<AdminArtistProfile />} />
          <Route path="referrals"        element={<AdminReferrals />} />
        </Route>

        {/* Public app */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<RedirectIfAuthed><OverviewPage /></RedirectIfAuthed>} />
          <Route path="/login" element={<RedirectIfAuthed><LoginPage /></RedirectIfAuthed>} />

          <Route path="/home" element={<RequireAuth><HomePage /></RequireAuth>} />
          <Route path="/artists" element={<RequireAuth><ArtistsPage /></RequireAuth>} />
          <Route path="/artists/:artistId" element={<RequireAuth><ArtistProfilePage /></RequireAuth>} />
          <Route path="/vault" element={<RequireAuth><VaultPage /></RequireAuth>} />
          <Route path="/merch" element={<RequireAuth><MerchPage /></RequireAuth>} />
          <Route path="/consent" element={<RequireAuth><ConsentFormsPage /></RequireAuth>} />
          <Route path="/passport" element={<RequireAuth><PassportPage /></RequireAuth>} />
          <Route path="/membership" element={<RequireAuth><MembershipPage /></RequireAuth>} />
          <Route path="/bookings" element={<RequireAuth><BookingsPage /></RequireAuth>} />
          <Route path="/bookings/select-time" element={<RequireAuth><SelectDateTimePage /></RequireAuth>} />
          <Route path="/bookings/checkin/:bookingId" element={<RequireAuth><CheckInPage /></RequireAuth>} />
          <Route path="/flash-queue/:eventId" element={<RequireAuth><FlashQueuePage /></RequireAuth>} />
          <Route path="/flash-queue" element={<RequireAuth><FlashQueuePage /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/booth-rent" element={<RequireAuth><BoothRentPage /></RequireAuth>} />
          <Route path="/settings" element={<Navigate to="/profile" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
