import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, LogIn, CheckCircle2, X, CalendarCheck, CreditCard } from 'lucide-react'
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
  const [checkinPopup, setCheckinPopup] = useState<Appointment | null>(null)
  const [confirmPopup, setConfirmPopup] = useState<Appointment | null>(null)
  const checkinShown = useRef(false)

  function mapRow(d: any): Appointment {
    return {
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
    }
  }

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
        const rows = (data ?? []).map(mapRow)
        setUpcoming(rows)
        setLoading(false)

        // Show check-in popup once per session for today's uncheck-in'd appointment
        if (!checkinShown.current) {
          const todayAppt = rows.find(a =>
            a.status === 'confirmed' && isToday(a.appointment_at) && !a.checked_in_at
          )
          if (todayAppt) {
            setCheckinPopup(todayAppt)
            checkinShown.current = true
          }
        }
      })
  }, [profile?.id])

  // Realtime: detect booking status changes (pending → confirmed)
  useEffect(() => {
    if (!profile?.id) return
    const channel = supabase
      .channel(`customer-bookings-${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `profile_id=eq.${profile.id}` },
        (payload) => {
          const updated = payload.new as any
          const previous = payload.old as any
          if (updated.status === 'confirmed' && previous.status === 'pending') {
            setUpcoming(prev => {
              const appt = prev.find(a => a.id === updated.id)
              if (appt) {
                const confirmed = { ...appt, status: 'confirmed' }
                setConfirmPopup(confirmed)
                return prev.map(a => a.id === updated.id ? confirmed : a)
              }
              return prev
            })
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile?.id])

  // Only show appointments that still need check-in in the prominent TODAY block
  const todayActionable = upcoming.filter(a =>
    a.status === 'confirmed' && isToday(a.appointment_at) && !a.checked_in_at
  )
  // Already checked-in today — show separately, less prominently
  const todayDone = upcoming.filter(a =>
    a.status === 'confirmed' && isToday(a.appointment_at) && !!a.checked_in_at
  )
  const rest = upcoming.filter(a => !(a.status === 'confirmed' && isToday(a.appointment_at)))

  return (
    <div className="page bookings-page">
      <PageHeader title="Bookings" />

      {/* ── Check-in day popup ── */}
      {checkinPopup && (
        <div className="bookings-popup-overlay">
          <div className="bookings-popup">
            <div className="bookings-popup__icon bookings-popup__icon--checkin">
              <CalendarCheck size={28} strokeWidth={1.5} />
            </div>
            <h3 className="bookings-popup__title">Time to Check In!</h3>
            <p className="bookings-popup__body">
              Your <strong>{checkinPopup.service}</strong> appointment with{' '}
              <strong>{checkinPopup.artist}</strong> is today at{' '}
              <strong>{checkinPopup.dateLabel.split(',').slice(-1)[0].trim()}</strong>.
            </p>
            <p className="bookings-popup__sub">Sign your consent form and check in when you arrive.</p>
            <div className="bookings-popup__actions">
              <button className="bookings-popup__dismiss" onClick={() => setCheckinPopup(null)}>
                Later
              </button>
              <Link
                to={`/bookings/checkin/${checkinPopup.id}`}
                className="bookings-popup__cta-btn"
                onClick={() => setCheckinPopup(null)}
              >
                <LogIn size={15} /> Check In Now
              </Link>
            </div>
            <button className="bookings-popup__close" onClick={() => setCheckinPopup(null)}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Booking confirmed popup ── */}
      {confirmPopup && (
        <div className="bookings-popup-overlay">
          <div className="bookings-popup">
            <div className="bookings-popup__icon bookings-popup__icon--confirm">
              <CheckCircle2 size={28} strokeWidth={1.5} />
            </div>
            <h3 className="bookings-popup__title">Booking Confirmed!</h3>
            <p className="bookings-popup__body">
              Your <strong>{confirmPopup.service}</strong> appointment with{' '}
              <strong>{confirmPopup.artist}</strong> on{' '}
              <strong>{confirmPopup.dateLabel}</strong> has been confirmed.
            </p>
            <p className="bookings-popup__sub">
              <CreditCard size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              Please arrange your deposit payment to secure your slot.
            </p>
            <div className="bookings-popup__actions">
              <button className="bookings-popup__cta-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setConfirmPopup(null)}>
                Got it
              </button>
            </div>
            <button className="bookings-popup__close" onClick={() => setConfirmPopup(null)}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="bookings-page__content">
        <Link to="/bookings/select-time" className="bookings-page__cta">
          Book new appointment
          <ChevronRight size={18} strokeWidth={1.5} />
        </Link>

        {/* ── Today's appointments ── */}
        {(todayActionable.length > 0 || todayDone.length > 0) && (
          <div className="bookings-page__today">
            <h2 className="bookings-page__today-label">TODAY</h2>
            {/* Appointments that still need check-in — shown prominently */}
            {todayActionable.map(appt => (
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
                <Link to={`/bookings/checkin/${appt.id}`} className="bookings-page__checkin-btn">
                  <LogIn size={15} strokeWidth={2} />
                  Check In Now
                </Link>
              </div>
            ))}
            {/* Already checked-in — compact row, no further action needed */}
            {todayDone.map(appt => (
              <div key={appt.id} className="bookings-page__today-done">
                <div className="bookings-page__today-info">
                  {appt.avatar
                    ? <img src={appt.avatar} alt="" className="bookings-page__today-avatar bookings-page__today-avatar--sm" />
                    : <div className="bookings-page__today-avatar bookings-page__today-avatar--empty bookings-page__today-avatar--sm" />}
                  <div>
                    <p className="bookings-page__today-service">{appt.service}</p>
                    <p className="bookings-page__today-artist">with {appt.artist}</p>
                  </div>
                </div>
                <div className="bookings-page__checked-in">
                  <CheckCircle2 size={14} strokeWidth={2} />
                  Checked In
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Upcoming ── */}
        <h2>Upcoming</h2>
        {loading && <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Loading…</p>}
        {!loading && rest.length === 0 && todayActionable.length === 0 && todayDone.length === 0 && (
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
