import { useEffect, useState } from 'react'
import { Bell, ChevronLeft, Clock, CalendarDays } from 'lucide-react'
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
}

type Reservation = {
  id: string
  position: number | null
  reserved_at: string
}

export function FlashQueuePage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { profile } = useAuth()

  const [event, setEvent] = useState<FlashEvent | null>(null)
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [queueSize, setQueueSize] = useState(0)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!eventId) return

    const { data: ev } = await supabase
      .from('flash_events')
      .select('*, artists(name)')
      .eq('id', eventId)
      .single()

    if (ev) {
      setEvent({
        ...ev,
        artist_name: (ev as any).artists?.name ?? null,
      })
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

  if (loading) {
    return (
      <div className="page flash-queue-page">
        <div className="flash-queue-page__top">
          <Link to="/home" className="flash-queue-page__back"><ChevronLeft size={24} strokeWidth={1.5} /></Link>
        </div>
        <p style={{ padding: 24, color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="page flash-queue-page">
        <div className="flash-queue-page__top">
          <Link to="/home" className="flash-queue-page__back"><ChevronLeft size={24} strokeWidth={1.5} /></Link>
        </div>
        <p style={{ padding: 24, color: 'var(--text-muted)' }}>Flash event not found.</p>
      </div>
    )
  }

  return (
    <div className="page flash-queue-page">
      <div className="flash-queue-page__top">
        <Link to="/home" className="flash-queue-page__back" aria-label="Go back">
          <ChevronLeft size={24} strokeWidth={1.5} />
        </Link>
      </div>

      <header className="flash-queue-page__event">
        <p className="flash-queue-page__eyebrow">FLASH DAY</p>
        <h1>{event.title.toUpperCase()}</h1>
        {event.artist_name && (
          <p className="flash-queue-page__style">with {event.artist_name}</p>
        )}
        <DiamondDivider className="flash-queue-page__divider" />
      </header>

      <div className="flash-queue-page__meta">
        <div className="flash-queue-page__meta-row">
          <CalendarDays size={16} strokeWidth={1.5} />
          <span>{dateLabel}</span>
        </div>
        <div className="flash-queue-page__meta-row">
          <Clock size={16} strokeWidth={1.5} />
          <span>{event.start_time.slice(0,5)} – {event.end_time.slice(0,5)}</span>
        </div>
        {event.description && (
          <p className="flash-queue-page__desc">{event.description}</p>
        )}
      </div>

      {event.status === 'closed' ? (
        <article className="flash-queue-page__card">
          <p className="flash-queue-page__status" style={{ color: 'var(--text-muted)' }}>
            THIS EVENT IS CLOSED
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center', marginTop: 8 }}>
            Keep an eye out for the next flash day!
          </p>
        </article>
      ) : event.status === 'upcoming' ? (
        <article className="flash-queue-page__card">
          <p className="flash-queue-page__status">QUEUE OPENS SOON</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center', marginTop: 8 }}>
            {spotsLeft} of {event.max_spots} spots available. Check back on the day!
          </p>
        </article>
      ) : reservation ? (
        <article className="flash-queue-page__card">
          <p className="flash-queue-page__status">YOU'RE IN THE QUEUE</p>
          <div className="flash-queue-page__number-wrap">
            <span className="flash-queue-page__watermark" aria-hidden>HH</span>
            <h2 className="flash-queue-page__number">#{reservation.position ?? queueSize}</h2>
          </div>

          <div className="flash-queue-page__stat">
            <Clock size={18} strokeWidth={1.5} />
            <div>
              <p className="flash-queue-page__stat-label">SPOTS REMAINING</p>
              <p className="flash-queue-page__stat-value">{spotsLeft} of {event.max_spots}</p>
            </div>
          </div>

          <div className="flash-queue-page__stat">
            <Bell size={18} strokeWidth={1.5} />
            <div>
              <p className="flash-queue-page__stat-label">WE'LL NOTIFY YOU</p>
              <p className="flash-queue-page__stat-copy">1 hour before it's your turn.</p>
            </div>
          </div>

          {error && <p style={{ color: '#ff6b6b', fontSize: '0.83rem' }}>{error}</p>}
          <GradientButton onClick={leaveQueue} disabled={acting}>
            {acting ? 'LEAVING…' : 'LEAVE QUEUE'}
          </GradientButton>
        </article>
      ) : (
        <article className="flash-queue-page__card">
          <p className="flash-queue-page__status">QUEUE IS OPEN</p>
          <div className="flash-queue-page__number-wrap">
            <span className="flash-queue-page__watermark" aria-hidden>HH</span>
            <h2 className="flash-queue-page__number">{queueSize + 1}</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
            {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Queue is full — join the waitlist'}
          </p>
          {error && <p style={{ color: '#ff6b6b', fontSize: '0.83rem' }}>{error}</p>}
          <GradientButton onClick={joinQueue} disabled={acting || spotsLeft === 0}>
            {acting ? 'JOINING…' : 'JOIN QUEUE'}
          </GradientButton>
        </article>
      )}
    </div>
  )
}
