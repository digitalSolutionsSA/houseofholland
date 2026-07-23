import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './FlashDayCard.css'

type FlashEvent = {
  id: string
  title: string
  date: string
  description: string | null
  status: string
}

export function FlashDayCard() {
  const [event, setEvent] = useState<FlashEvent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('flash_events')
      .select('id, title, date, description, status')
      .in('status', ['upcoming', 'open'])
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date')
      .limit(1)
      .single()
      .then(({ data }) => { setEvent(data ?? null); setLoading(false) })
  }, [])

  if (loading || !event) return null

  const dateLabel = new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric',
  }).toUpperCase()

  return (
    <article className="flash-day-card">
      <div className="flash-day-card__overlay flash-day-card__overlay--no-img">
        <div className="flash-day-card__tag">{event.status === 'open' ? '🔴 LIVE NOW' : 'COMING UP'}</div>
        <h2 className="flash-day-card__title">FLASH DAY</h2>
        <p className="flash-day-card__date">{dateLabel}</p>
        {event.description && <p className="flash-day-card__desc">{event.description}</p>}
        <Link to={`/flash-queue/${event.id}`} className="flash-day-card__cta">
          {event.status === 'open' ? 'JOIN QUEUE' : 'VIEW EVENT'}
        </Link>
      </div>
    </article>
  )
}
