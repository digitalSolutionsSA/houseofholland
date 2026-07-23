import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './FlashDayCard.css'

type FlashEvent = {
  id: string
  title: string
  date: string
  description: string | null
  status: string
  max_spots: number
  artist_name: string | null
}

export function FlashDayCard() {
  const [event, setEvent] = useState<FlashEvent | null>(null)
  const [spotsLeft, setSpotsLeft] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: ev } = await supabase
        .from('flash_events')
        .select('id, title, date, description, status, max_spots')
        .in('status', ['upcoming', 'open'])
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date')
        .limit(1)
        .single()

      if (!ev) { setLoading(false); return }

      // Fetch first artist from junction table
      const { data: junc } = await supabase
        .from('flash_event_artists')
        .select('artists(name)')
        .eq('flash_event_id', ev.id)
        .limit(1)
        .single()

      const artistName = (junc as any)?.artists?.name ?? null
      setEvent({ ...ev, artist_name: artistName })

      const { count } = await supabase
        .from('flash_reservations')
        .select('id', { count: 'exact', head: true })
        .eq('flash_event_id', ev.id)

      setSpotsLeft(Math.max(0, ev.max_spots - (count ?? 0)))
      setLoading(false)
    }
    load()
  }, [])

  if (loading || !event) return null

  const dateLabel = new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric',
  }).toUpperCase()

  const isLive = event.status === 'open'

  return (
    <article className="flash-day-card">
      <div className="flash-day-card__accent" aria-hidden />
      <div className="flash-day-card__overlay flash-day-card__overlay--no-img">

        <div className="flash-day-card__top">
          <span className={`flash-day-card__tag${isLive ? ' flash-day-card__tag--live' : ''}`}>
            {isLive ? '● LIVE NOW' : '⚡ COMING UP'}
          </span>
          <span className="flash-day-card__date-pill">{dateLabel}</span>
        </div>

        <div className="flash-day-card__body">
          <p className="flash-day-card__eyebrow">FLASH DAY</p>
          <h2 className="flash-day-card__title">{event.title}</h2>
          {event.artist_name && (
            <p className="flash-day-card__event-name">with {event.artist_name}</p>
          )}
          {event.description && (
            <p className="flash-day-card__desc">{event.description}</p>
          )}
        </div>

        <div className="flash-day-card__footer">
          <Link to={`/flash-queue/${event.id}`} className="flash-day-card__cta">
            <Zap size={12} strokeWidth={2.5} />
            {isLive ? 'JOIN QUEUE' : 'VIEW EVENT'}
          </Link>
          {spotsLeft !== null && (
            <p className="flash-day-card__spots">
              <span>{spotsLeft}</span> of {event.max_spots} spots left
            </p>
          )}
        </div>

      </div>
    </article>
  )
}
