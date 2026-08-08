import { useEffect, useState } from 'react'
import { Bell, ChevronLeft, Clock, CalendarDays, User, Zap } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { storageImg } from '../lib/storageImg'
import { useAuth } from '../context/AuthContext'
import './FlashQueuePage.css'

type FlashEvent = {
  id: string
  title: string
  date: string
  start_time: string
  end_time: string
  description: string | null
  status: 'upcoming' | 'open' | 'closed'
  max_spots: number
}

type ArtistChip = { id: string; name: string; avatar_url: string | null }

type Reservation = {
  id: string
  position: number | null
  reserved_at: string
}

export function FlashQueuePage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { profile } = useAuth()

  const [event, setEvent] = useState<FlashEvent | null>(null)
  const [artists, setArtists] = useState<ArtistChip[]>([])
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [queueSize, setQueueSize] = useState(0)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!eventId) return

    const { data: ev } = await supabase
      .from('flash_events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (ev) setEvent(ev)

    const [{ data: junc }, { data: gjunc }] = await Promise.all([
      supabase.from('flash_event_artists').select('artists(id, name, avatar_url)').eq('flash_event_id', eventId),
      supabase.from('flash_event_guest_artists').select('guest_artists(id, name, avatar_url)').eq('flash_event_id', eventId),
    ])

    const residentArtists = (junc ?? [])
      .map((r: any) => r.artists).filter(Boolean)
      .map((a: any) => ({ id: a.id, name: a.name, avatar_url: a.avatar_url ?? null }))

    const guestArtistList = (gjunc ?? [])
      .map((r: any) => r.guest_artists).filter(Boolean)
      .map((a: any) => ({ id: `g-${a.id}`, name: a.name, avatar_url: a.avatar_url ?? null }))

    setArtists([...residentArtists, ...guestArtistList])

    const { count } = await supabase
      .from('flash_reservations')
      .select('id', { count: 'exact', head: true })
      .eq('flash_event_id', eventId)

    setQueueSize(count ?? 0)

    if (profile?.id) {
      const { data: res } = await supabase
        .from('flash_reservations')
        .select('id, position, reserved_at')
        .eq('flash_event_id', eventId)
        .eq('profile_id', profile.id)
        .single()
      setReservation(res ?? null)
    }

    setLoading(false)
  }

  useEffect(() => { load() }, [eventId, profile?.id])

  async function joinQueue() {
    if (!event || !profile) return
    setActing(true); setError(null)
    const { data, error: err } = await supabase
      .from('flash_reservations')
      .insert({ flash_event_id: event.id, profile_id: profile.id, position: queueSize + 1 })
      .select('id, position, reserved_at')
      .single()
    if (err) setError(err.message)
    else { setReservation(data); setQueueSize(q => q + 1) }
    setActing(false)
  }

  async function leaveQueue() {
    if (!reservation) return
    setActing(true)
    await supabase.from('flash_reservations').delete().eq('id', reservation.id)
    setReservation(null)
    setQueueSize(q => Math.max(0, q - 1))
    setActing(false)
  }

  const dateLabel = event
    ? new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : ''

  const spotsLeft = event ? Math.max(0, event.max_spots - queueSize) : 0
  const fillPct   = event ? Math.min(100, (queueSize / event.max_spots) * 100) : 0

  if (loading) return (
    <div className="page flash-queue-page">
      <Link to="/home" className="flash-queue-page__back" aria-label="Go back">
        <ChevronLeft size={20} strokeWidth={1.5} />
      </Link>
      <div className="flash-queue-page__loading">Loading…</div>
    </div>
  )

  if (!event) return (
    <div className="page flash-queue-page">
      <Link to="/home" className="flash-queue-page__back" aria-label="Go back">
        <ChevronLeft size={20} strokeWidth={1.5} />
      </Link>
      <p style={{ padding: 24, color: 'var(--text-muted)' }}>Event not found.</p>
    </div>
  )

  const statusLabel = event.status === 'open' ? '● Queue Open' : event.status === 'upcoming' ? '◆ Coming Soon' : '✕ Closed'

  return (
    <div className="page flash-queue-page">

      <Link to="/home" className="flash-queue-page__back" aria-label="Go back">
        <ChevronLeft size={20} strokeWidth={1.5} />
      </Link>

      {/* ── Hero ── */}
      <div className="flash-queue-page__hero">
        <p className="flash-queue-page__eyebrow">
          <Zap size={11} strokeWidth={2.5} fill="currentColor" />
          Flash Day
        </p>
        <h1>{event.title}</h1>
        <span className={`flash-queue-page__status-pill flash-queue-page__status-pill--${event.status}`}>
          {statusLabel}
        </span>
      </div>

      {/* ── Meta ── */}
      <div className="flash-queue-page__meta">
        <span className="flash-queue-page__meta-item">
          <CalendarDays size={13} strokeWidth={1.5} />
          {dateLabel}
        </span>
        <span className="flash-queue-page__meta-dot" />
        <span className="flash-queue-page__meta-item">
          <Clock size={13} strokeWidth={1.5} />
          {event.start_time.slice(0, 5)} – {event.end_time.slice(0, 5)}
        </span>
      </div>

      {event.description && (
        <p className="flash-queue-page__desc">{event.description}</p>
      )}

      {/* ── Artist lineup ── */}
      {artists.length > 0 && (
        <>
          <hr className="flash-queue-page__rule" />
          <div className="flash-queue-page__lineup">
            <p className="flash-queue-page__lineup-label">Artists Lined Up</p>
            <div className="flash-queue-page__artists">
              {artists.map(a => (
                <div key={a.id} className="flash-queue-page__artist">
                  {a.avatar_url ? (
                    <img src={storageImg(a.avatar_url, 80) ?? a.avatar_url} alt={a.name} className="flash-queue-page__artist-avatar" loading="lazy" decoding="async" />
                  ) : (
                    <div className="flash-queue-page__artist-avatar--empty">
                      <User size={26} strokeWidth={1.5} />
                    </div>
                  )}
                  <span className="flash-queue-page__artist-name">{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <hr className="flash-queue-page__rule" />

      {/* ── Queue section ── */}
      <div className="flash-queue-page__card">

        {/* ── Spots urgency block ── */}
        {event.status !== 'closed' && (() => {
          const pct = spotsLeft / event.max_spots
          const urgency = pct === 0 ? 'none' : pct <= 0.2 ? 'critical' : pct <= 0.5 ? 'low' : 'ok'
          const urgencyMsg =
            urgency === 'none'     ? 'All spots are taken — join the waitlist below.' :
            urgency === 'critical' ? `Only ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left — secure yours now.` :
            urgency === 'low'      ? `${spotsLeft} spots remaining — filling fast.` :
                                     `${spotsLeft} of ${event.max_spots} spots still available.`
          return (
            <div className={`flash-queue-page__spots-block flash-queue-page__spots-block--${urgency}`}>
              <div className="flash-queue-page__spots-top">
                <div className="flash-queue-page__spots-number">{spotsLeft}</div>
                <div className="flash-queue-page__spots-meta">
                  <span className="flash-queue-page__spots-label">Spots Remaining</span>
                  <span className="flash-queue-page__spots-total">out of {event.max_spots}</span>
                </div>
              </div>
              <div className="flash-queue-page__bar-track">
                <div className="flash-queue-page__bar-fill" style={{ width: `${fillPct}%` }} />
              </div>
              <p className="flash-queue-page__spots-msg">{urgencyMsg}</p>
            </div>
          )
        })()}

        {event.status === 'closed' && (
          <p className="flash-queue-page__state-copy">
            This flash day has ended.<br />Keep an eye out for the next one.
          </p>
        )}

        {event.status === 'upcoming' && (
          <p className="flash-queue-page__state-copy">
            Queue opens on the day. Check back soon.
          </p>
        )}

        {event.status === 'open' && reservation && (
          <>
            <div className="flash-queue-page__number-block">
              <p className="flash-queue-page__number">#{reservation.position ?? queueSize}</p>
              <p className="flash-queue-page__number-label">Your Queue Position</p>
            </div>

            <div className="flash-queue-page__notice">
              <Bell size={14} strokeWidth={1.5} />
              <span>You'll be notified an hour before it's your turn. Show up on time — spots pass to the next person if you're late.</span>
            </div>

            {error && <p className="flash-queue-page__error">{error}</p>}

            <button className="flash-queue-page__cta flash-queue-page__cta--ghost" onClick={leaveQueue} disabled={acting}>
              {acting ? 'Leaving…' : 'Leave Queue'}
            </button>
          </>
        )}

        {event.status === 'open' && !reservation && (
          <>
            <div className="flash-queue-page__number-block">
              <p className="flash-queue-page__number">{queueSize + 1}</p>
              <p className="flash-queue-page__number-label">
                {spotsLeft > 0 ? 'You would be position' : 'Waitlist position'}
              </p>
            </div>

            {error && <p className="flash-queue-page__error">{error}</p>}

            <button className="flash-queue-page__cta" onClick={joinQueue} disabled={acting}>
              {acting ? 'Joining…' : spotsLeft > 0 ? 'Join Queue' : 'Join Waitlist'}
            </button>
          </>
        )}

      </div>
    </div>
  )
}
