import { useEffect, useState } from 'react'
import { Bell, ChevronLeft, Clock, CalendarDays, Zap, User } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { DiamondDivider } from '../components/shared/DiamondDivider'
import { GradientButton } from '../components/shared/GradientButton'
import { supabase } from '../lib/supabase'
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
  artist_name: string | null
  artist_avatar: string | null
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
      .select('*, artists(id, name, avatar_url)')
      .eq('id', eventId)
      .single()

    if (ev) {
      const a = (ev as any).artists
      setEvent({
        ...ev,
        artist_name: a?.name ?? null,
        artist_avatar: a?.avatar_url ?? null,
      })
      // build lineup — start with the linked artist if present
      if (a) setArtists([{ id: a.id, name: a.name, avatar_url: a.avatar_url ?? null }])
    }

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
    setActing(true)
    setError(null)
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
  const fillPct = event ? Math.min(100, (queueSize / event.max_spots) * 100) : 0

  if (loading) {
    return (
      <div className="page flash-queue-page">
        <div className="flash-queue-page__hero">
          <Link to="/home" className="flash-queue-page__back"><ChevronLeft size={24} strokeWidth={1.5} /></Link>
        </div>
        <p style={{ padding: 24, color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="page flash-queue-page">
        <div className="flash-queue-page__hero">
          <Link to="/home" className="flash-queue-page__back"><ChevronLeft size={24} strokeWidth={1.5} /></Link>
        </div>
        <p style={{ padding: 24, color: 'var(--text-muted)' }}>Flash event not found.</p>
      </div>
    )
  }

  return (
    <div className="page flash-queue-page">

      {/* ── Hero ── */}
      <div className="flash-queue-page__hero">
        <Link to="/home" className="flash-queue-page__back" aria-label="Go back">
          <ChevronLeft size={24} strokeWidth={1.5} />
        </Link>
        <div className="flash-queue-page__hero-content">
          <p className="flash-queue-page__eyebrow">⚡ FLASH DAY</p>
          <h1>{event.title.toUpperCase()}</h1>
        </div>
      </div>

      {/* ── Meta ── */}
      <div className="flash-queue-page__meta">
        <div className="flash-queue-page__meta-row">
          <CalendarDays size={15} strokeWidth={1.5} />
          <span>{dateLabel}</span>
        </div>
        <div className="flash-queue-page__meta-row">
          <Clock size={15} strokeWidth={1.5} />
          <span>{event.start_time.slice(0,5)} – {event.end_time.slice(0,5)}</span>
        </div>
      </div>

      {event.description && (
        <div className="flash-queue-page__desc-wrap">
          <p className="flash-queue-page__desc">{event.description}</p>
        </div>
      )}

      {/* ── Artist lineup ── */}
      {artists.length > 0 && (
        <div className="flash-queue-page__lineup">
          <p className="flash-queue-page__lineup-title">ARTISTS LINED UP</p>
          <div className="flash-queue-page__artists">
            {artists.map(a => (
              <div key={a.id} className="flash-queue-page__artist-chip">
                {a.avatar_url ? (
                  <img src={a.avatar_url} alt={a.name} className="flash-queue-page__artist-avatar" />
                ) : (
                  <div className="flash-queue-page__artist-avatar--placeholder">
                    <User size={12} strokeWidth={2} />
                  </div>
                )}
                <span className="flash-queue-page__artist-name">{a.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flash-queue-page__divider">
        <DiamondDivider />
      </div>

      {/* ── Card ── */}
      {event.status === 'closed' ? (
        <article className="flash-queue-page__card">
          <span className="flash-queue-page__status flash-queue-page__status--closed">CLOSED</span>
          <p className="flash-queue-page__closed-copy">
            This flash day has ended.<br />Keep an eye out for the next one!
          </p>
        </article>

      ) : event.status === 'upcoming' ? (
        <article className="flash-queue-page__card">
          <span className="flash-queue-page__status flash-queue-page__status--upcoming">COMING SOON</span>
          <div className="flash-queue-page__spots">
            <div className="flash-queue-page__spots-row">
              <span className="flash-queue-page__spots-label">SPOTS AVAILABLE</span>
              <span className="flash-queue-page__spots-count">{spotsLeft} / {event.max_spots}</span>
            </div>
            <div className="flash-queue-page__progress">
              <div className="flash-queue-page__progress-fill" style={{ width: `${fillPct}%` }} />
            </div>
          </div>
          <p className="flash-queue-page__closed-copy">
            Queue opens on the day. Check back soon!
          </p>
        </article>

      ) : reservation ? (
        <article className="flash-queue-page__card">
          <span className="flash-queue-page__status flash-queue-page__status--joined">YOU'RE IN THE QUEUE</span>

          <div className="flash-queue-page__number-wrap">
            <span className="flash-queue-page__watermark" aria-hidden>HH</span>
            <p className="flash-queue-page__number">#{reservation.position ?? queueSize}</p>
            <p className="flash-queue-page__number-label">YOUR QUEUE POSITION</p>
          </div>

          <div className="flash-queue-page__spots">
            <div className="flash-queue-page__spots-row">
              <span className="flash-queue-page__spots-label">SPOTS REMAINING</span>
              <span className="flash-queue-page__spots-count">{spotsLeft} / {event.max_spots}</span>
            </div>
            <div className="flash-queue-page__progress">
              <div className="flash-queue-page__progress-fill" style={{ width: `${fillPct}%` }} />
            </div>
          </div>

          <div className="flash-queue-page__stat">
            <Bell size={18} strokeWidth={1.5} />
            <div>
              <p className="flash-queue-page__stat-label">WE'LL NOTIFY YOU</p>
              <p className="flash-queue-page__stat-copy">You'll receive a notification 1 hour before it's your turn.</p>
            </div>
          </div>

          <div className="flash-queue-page__note">
            <Clock size={14} strokeWidth={1.5} />
            <span>Show up on time when called — spots may be passed to the next person if you're late.</span>
          </div>

          {error && <p style={{ color: '#ff6b6b', fontSize: '0.83rem' }}>{error}</p>}
          <GradientButton onClick={leaveQueue} disabled={acting}>
            {acting ? 'LEAVING…' : 'LEAVE QUEUE'}
          </GradientButton>
        </article>

      ) : (
        <article className="flash-queue-page__card">
          <span className="flash-queue-page__status flash-queue-page__status--open">● QUEUE IS OPEN</span>

          <div className="flash-queue-page__number-wrap">
            <span className="flash-queue-page__watermark" aria-hidden>HH</span>
            <p className="flash-queue-page__number">{queueSize + 1}</p>
            <p className="flash-queue-page__number-label">
              {spotsLeft > 0 ? 'YOU WOULD BE POSITION' : 'WAITLIST POSITION'}
            </p>
          </div>

          <div className="flash-queue-page__spots">
            <div className="flash-queue-page__spots-row">
              <span className="flash-queue-page__spots-label">
                {spotsLeft > 0 ? 'SPOTS REMAINING' : 'QUEUE FULL — WAITLIST OPEN'}
              </span>
              <span className="flash-queue-page__spots-count">{spotsLeft} / {event.max_spots}</span>
            </div>
            <div className="flash-queue-page__progress">
              <div className="flash-queue-page__progress-fill" style={{ width: `${fillPct}%` }} />
            </div>
          </div>

          {error && <p style={{ color: '#ff6b6b', fontSize: '0.83rem' }}>{error}</p>}
          <GradientButton onClick={joinQueue} disabled={acting}>
            {acting ? 'JOINING…' : spotsLeft > 0 ? 'JOIN QUEUE' : 'JOIN WAITLIST'}
          </GradientButton>
        </article>
      )}
    </div>
  )
}
