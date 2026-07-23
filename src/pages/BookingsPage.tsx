import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, LogIn, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '../components/shared/PageHeader'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './BookingsPage.css'

type Appointment = {
  id: string
  appointment_at: string
  dateLabel: string
  artist: string
  service: string
  avatar: string | null
  status: string
  checked_in_at: string | null
}

function isToday(dateStr: string) {
  const d = new Date(dateStr), t = new Date()
  return d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
}

export function BookingsPage() {
  const { profile } = useAuth()
  const [upcoming, setUpcoming] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    supabase
      .from('bookings')
      .select('id, appointment_at, service, status, checked_in_at, artists(name, avatar_url)')
      .eq('profile_id', profile.id)
      .in('status', ['pending', 'confirmed'])
      .gte('appointment_at', new Date().toISOString())
      .order('appointment_at')
      .then(({ data }) => {
        setUpcoming(
          (data ?? []).map((d: any) => ({
            id: d.id,
            appointment_at: d.appointment_at,
            dateLabel: new Date(d.appointment_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
              hour: 'numeric', minute: '2-digit',
            }),
            artist: d.artists?.name ?? 'Artist',
            service: d.service,
            avatar: d.artists?.avatar_url ?? null,
            status: d.status,
            checked_in_at: d.checked_in_at ?? null,
          }))
        )
        setLoading(false)
      })
  }, [profile?.id])

  const todayConfirmed = upcoming.filter(a => a.status === 'confirmed' && isToday(a.appointment_at))
  const rest = upcoming.filter(a => !(a.status === 'confirmed' && isToday(a.appointment_at)))

  return (
    <div className="page bookings-page">
      <PageHeader title="Bookings" />
      <div className="bookings-page__content">
        <Link to="/bookings/select-time" className="bookings-page__cta">
          Book new appointment
          <ChevronRight size={18} strokeWidth={1.5} />
        </Link>

        {/* ── Today's appointments ── */}
        {todayConfirmed.length > 0 && (
          <div className="bookings-page__today">
            <h2 className="bookings-page__today-label">TODAY</h2>
            {todayConfirmed.map(appt => (
              <div key={appt.id} className="bookings-page__today-card">
                <div className="bookings-page__today-info">
                  {appt.avatar
                    ? <img src={appt.avatar} alt="" className="bookings-page__today-avatar" />
                    : <div className="bookings-page__today-avatar bookings-page__today-avatar--empty" />}
                  <div>
                    <p className="bookings-page__today-service">{appt.service}</p>
                    <p className="bookings-page__today-artist">with {appt.artist}</p>
                    <p className="bookings-page__today-time">{appt.dateLabel}</p>
                  </div>
                </div>
                {appt.checked_in_at ? (
                  <div className="bookings-page__checked-in">
                    <CheckCircle2 size={15} strokeWidth={2} />
                    Checked In
                  </div>
                ) : (
                  <Link to={`/bookings/checkin/${appt.id}`} className="bookings-page__checkin-btn">
                    <LogIn size={15} strokeWidth={2} />
                    Check In Now
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Upcoming ── */}
        <h2>Upcoming</h2>
        {loading && <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Loading…</p>}
        {!loading && rest.length === 0 && todayConfirmed.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No upcoming bookings.</p>
        )}
        {rest.map(appt => (
          <article key={appt.id} className="appointment-card">
            {appt.avatar
              ? <img src={appt.avatar} alt="" className="appointment-card__avatar" />
              : <div className="appointment-card__avatar appointment-card__avatar--empty" />}
            <div className="appointment-card__body">
              <p className="appointment-card__when">{appt.dateLabel}</p>
              <p className="appointment-card__artist">with {appt.artist}</p>
              <p className="appointment-card__service">{appt.service}</p>
              <span className={`bookings-page__status bookings-page__status--${appt.status}`}>
                {appt.status}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
