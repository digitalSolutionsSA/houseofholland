import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, LogIn, CheckCircle2, X, CalendarCheck, CreditCard, AlertTriangle } from 'lucide-react'
import { PageHeader } from '../components/shared/PageHeader'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './BookingsPage.css'

type Appointment = {
  id: string
  appointment_at: string
  dateLabel: string
  artist: string
  artistProfileId: string | null
  service: string
  avatar: string | null
  status: string
  checked_in_at: string | null
  deposit_link: string | null
}

function isToday(dateStr: string) {
  const d = new Date(dateStr), t = new Date()
  return d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
}

export function BookingsPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [upcoming, setUpcoming] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [checkinPopup, setCheckinPopup] = useState<Appointment | null>(null)
  const [confirmPopup, setConfirmPopup] = useState<Appointment | null>(null)
  const [cancelPopup, setCancelPopup] = useState<Appointment | null>(null)
  const [cancelling, setCancelling] = useState(false)
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
      artistProfileId: d.artists?.profile_id ?? null,
      status: d.status,
      checked_in_at: d.checked_in_at ?? null,
      deposit_link: d.deposit_link ?? null,
    }
  }

  // Redirect artists/managers to their admin bookings panel
  useEffect(() => {
    if (profile && (profile.role === 'artist' || profile.role === 'manager')) {
      navigate('/admin/bookings', { replace: true })
    }
  }, [profile?.role])

  useEffect(() => {
    if (!profile?.id) return
    supabase
      .from('bookings')
      .select('id, appointment_at, service, status, checked_in_at, deposit_link, artists(name, avatar_url, profile_id)')
      .eq('profile_id', profile.id)
      .in('status', ['pending', 'accepted', 'confirmed'])
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

          if (updated.status === 'accepted' && previous.status === 'pending') {
            // Artist accepted — show deposit link popup
            setUpcoming(prev => {
              const appt = prev.find(a => a.id === updated.id)
              if (appt) {
                const accepted = { ...appt, status: 'accepted', deposit_link: updated.deposit_link ?? null }
                setConfirmPopup(accepted)
                return prev.map(a => a.id === updated.id ? accepted : a)
              }
              // Not in list yet — add it (may not have been loaded)
              return prev
            })
          } else if (updated.status === 'confirmed' && (previous.status === 'accepted' || previous.status === 'pending')) {
            // Artist locked the appointment
            setUpcoming(prev => {
              const appt = prev.find(a => a.id === updated.id)
              if (appt) {
                const confirmed = { ...appt, status: 'confirmed' }
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

  async function cancelBooking(appt: Appointment) {
    setCancelling(true)
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', cancellation_reason: 'customer_cancellation' })
      .eq('id', appt.id)
    if (error) { setCancelling(false); return }

    if (appt.artistProfileId) {
      const label = new Date(appt.appointment_at).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
      await supabase.from('notifications').insert({
        profile_id: appt.artistProfileId,
        title: 'Booking Cancelled by Client',
        body: `${appt.artist ? appt.artist : 'A client'} cancelled their ${appt.service} booking on ${label}.`,
        type: 'booking',
      })
    }

    setUpcoming(prev => prev.filter(a => a.id !== appt.id))
    setCancelPopup(null)
    setCancelling(false)
  }

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

      {/* ── Booking accepted / deposit prompt popup ── */}
      {confirmPopup && (
        <div className="bookings-popup-overlay">
          <div className="bookings-popup">
            <div className="bookings-popup__icon bookings-popup__icon--confirm">
              <CheckCircle2 size={28} strokeWidth={1.5} />
            </div>
            <h3 className="bookings-popup__title">
              {confirmPopup.status === 'accepted' ? 'Request Accepted!' : 'Booking Locked In!'}
            </h3>
            <p className="bookings-popup__body">
              Your <strong>{confirmPopup.service}</strong> appointment with{' '}
              <strong>{confirmPopup.artist}</strong> on{' '}
              <strong>{confirmPopup.dateLabel}</strong> has been{' '}
              {confirmPopup.status === 'accepted' ? 'accepted.' : 'confirmed.'}
            </p>
            {confirmPopup.status === 'accepted' && confirmPopup.deposit_link && (
              <>
                <p className="bookings-popup__sub">
                  <CreditCard size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                  Pay your deposit to secure your slot:
                </p>
                <a
                  href={confirmPopup.deposit_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bookings-popup__cta-btn"
                  style={{ display: 'flex', justifyContent: 'center', marginTop: 4, marginBottom: 8 }}
                >
                  <CreditCard size={14} /> Pay Deposit
                </a>
              </>
            )}
            {confirmPopup.status === 'accepted' && !confirmPopup.deposit_link && (
              <p className="bookings-popup__sub">
                <CreditCard size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                The artist will send you a deposit payment link soon.
              </p>
            )}
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

      {/* ── Cancel booking popup ── */}
      {cancelPopup && (
        <div className="bookings-popup-overlay">
          <div className="bookings-popup">
            <div className="bookings-popup__icon bookings-popup__icon--warn">
              <AlertTriangle size={28} strokeWidth={1.5} />
            </div>
            <h3 className="bookings-popup__title">Cancel Appointment?</h3>
            <p className="bookings-popup__body">
              <strong>{cancelPopup.service}</strong> with <strong>{cancelPopup.artist}</strong> on{' '}
              <strong>{cancelPopup.dateLabel}</strong>
            </p>
            {cancelPopup.status === 'confirmed' ? (
              <p className="bookings-popup__sub bookings-popup__sub--warn">
                This appointment has been locked in and your deposit has been paid.
                Cancelling now means <strong>you will lose your deposit</strong>. This cannot be undone.
              </p>
            ) : (
              <p className="bookings-popup__sub">
                Are you sure you want to cancel this booking? The artist will be notified.
              </p>
            )}
            <div className="bookings-popup__actions">
              <button className="bookings-popup__dismiss" onClick={() => setCancelPopup(null)}>
                Keep It
              </button>
              <button
                className="bookings-popup__cta-btn bookings-popup__cta-btn--danger"
                onClick={() => cancelBooking(cancelPopup)}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
              </button>
            </div>
            <button className="bookings-popup__close" onClick={() => setCancelPopup(null)}>
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
                {appt.status === 'accepted' ? 'Accepted — Deposit Required' : appt.status}
              </span>
              {appt.status === 'accepted' && appt.deposit_link && (
                <a
                  href={appt.deposit_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bookings-page__deposit-btn"
                >
                  <CreditCard size={13} /> Pay Deposit
                </a>
              )}
              <button
                className="bookings-page__cancel-btn"
                onClick={() => setCancelPopup(appt)}
              >
                Cancel appointment
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
