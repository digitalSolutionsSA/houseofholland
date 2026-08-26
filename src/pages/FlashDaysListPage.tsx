import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { PageHeader } from '../components/shared/PageHeader'
import { supabase } from '../lib/supabase'
import './FlashDaysListPage.css'

type FlashEvent = {
  id: string
  title: string
  date: string
  description: string | null
  status: 'upcoming' | 'open' | 'closed'
  max_spots: number
  cover_image_url: string | null
}

export function FlashDaysListPage() {
  const [events, setEvents] = useState<FlashEvent[]>([])
  const [spotsByEvent, setSpotsByEvent] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: ev } = await supabase
        .from('flash_events')
        .select('id, title, date, description, status, max_spots, cover_image_url')
        .in('status', ['upcoming', 'open'])
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })

      const rows = ev ?? []
      setEvents(rows)

      if (rows.length > 0) {
        const { data: counts } = await supabase
          .from('flash_reservations')
          .select('flash_event_id')
          .in('flash_event_id', rows.map(r => r.id))

        const tally: Record<string, number> = {}
        for (const r of counts ?? []) tally[r.flash_event_id] = (tally[r.flash_event_id] ?? 0) + 1
        setSpotsByEvent(tally)
      }

      setLoading(false)
    }
    load()
  }, [])

  const dateLabel = (dateStr: string) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'long', day: 'numeric',
    })

  return (
    <div className="page flash-days-list-page">
      <PageHeader title="Flash Days" backTo="/home" />

      {loading ? (
        <p className="flash-days-list-page__loading">Loading…</p>
      ) : events.length === 0 ? (
        <div className="flash-days-list-page__empty">
          <Zap size={28} strokeWidth={1.2} />
          <p>No upcoming flash days</p>
          <span>Check back soon — we'll notify you the moment a new one is announced.</span>
        </div>
      ) : (
        <div className="flash-days-list-page__list">
          {events.map(ev => {
            const spotsLeft = Math.max(0, ev.max_spots - (spotsByEvent[ev.id] ?? 0))
            const isLive = ev.status === 'open'
            return (
              <Link key={ev.id} to={`/flash-queue/${ev.id}`} className="flash-days-list-page__card">
                {ev.cover_image_url ? (
                  <img src={ev.cover_image_url} alt="" className="flash-days-list-page__cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="flash-days-list-page__cover flash-days-list-page__cover--empty">
                    <Zap size={22} strokeWidth={1.5} />
                  </div>
                )}
                <div className="flash-days-list-page__body">
                  <span className={`flash-days-list-page__tag${isLive ? ' flash-days-list-page__tag--live' : ''}`}>
                    {isLive ? '● QUEUE OPEN' : '◆ COMING SOON'}
                  </span>
                  <h2 className="flash-days-list-page__title">{ev.title}</h2>
                  <p className="flash-days-list-page__date">{dateLabel(ev.date)}</p>
                  <p className="flash-days-list-page__spots">
                    <span>{spotsLeft}</span> of {ev.max_spots} spots left
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
