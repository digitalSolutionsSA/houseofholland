import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

type Artist = { id: string; name: string; profile_id: string | null }
type Booking = {
  id: string
  appointment_at: string
  service: string
  notes: string | null
  status: string
  profiles: { full_name: string | null; email: string | null; phone: string | null } | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
}

export function AdminBookings() {
  const { profile } = useAuth()
  const [artists, setArtists]         = useState<Artist[]>([])
  const [artistId, setArtistId]       = useState<string>('')
  const [bookings, setBookings]       = useState<Booking[]>([])
  const [filter, setFilter]           = useState<'pending' | 'confirmed' | 'all'>('pending')
  const [loading, setLoading]         = useState(true)
  const [acting, setActing]           = useState<string | null>(null)

  const isManager = profile?.role === 'manager'

  async function loadBookings(aid: string) {
    setLoading(true)
    let q = supabase
      .from('bookings')
      .select('id, appointment_at, service, notes, status, profiles(full_name, email, phone)')
      .eq('artist_id', aid)
      .gte('appointment_at', new Date().toISOString())
      .order('appointment_at')

    if (filter !== 'all') q = q.eq('status', filter)

    const { data } = await q
    setBookings((data as any) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      const { data: list } = await supabase
        .from('artists')
        .select('id, name, profile_id')
        .eq('is_active', true)
        .order('name')
      setArtists(list ?? [])

      const mine = (list ?? []).find((a: any) => a.profile_id === profile?.id)
      const id = mine?.id ?? (isManager ? list?.[0]?.id : null)
      if (id) { setArtistId(id); loadBookings(id) }
      else setLoading(false)
    }
    init()
  }, [profile?.id])

  useEffect(() => {
    if (artistId) loadBookings(artistId)
  }, [artistId, filter])

  async function updateStatus(id: string, status: 'confirmed' | 'rejected') {
    setActing(id)
    await supabase.from('bookings').update({ status }).eq('id', id)
    setBookings(b => b.map(x => x.id === id ? { ...x, status } : x))
    setActing(null)
  }

  function fmt(ts: string) {
    return new Date(ts).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      year: 'numeric', hour: 'numeric', minute: '2-digit',
    })
  }

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Appointments</h1>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {isManager && artists.length > 1 && (
          <select className="admin-modal__select" style={{ maxWidth: 200 }}
            value={artistId} onChange={e => setArtistId(e.target.value)}>
            {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
        {(['pending', 'confirmed', 'all'] as const).map(f => (
          <button
            key={f}
            className={`admin-btn ${filter === f ? 'admin-btn--primary' : 'admin-btn--ghost'}`}
            onClick={() => setFilter(f)}
            style={{ textTransform: 'capitalize' }}
          >
            {f === 'all' ? 'All Upcoming' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="admin-empty">Loading…</p>
      ) : bookings.length === 0 ? (
        <p className="admin-empty">No {filter === 'all' ? 'upcoming' : filter} appointments.</p>
      ) : (
        <div className="admin-booking-list">
          {bookings.map(b => {
            const client = b.profiles as any
            return (
              <div key={b.id} className={`admin-booking-card admin-booking-card--${b.status}`}>
                <div className="admin-booking-card__top">
                  <div>
                    <div className="admin-booking-card__name">{client?.full_name ?? 'Unknown client'}</div>
                    <div className="admin-booking-card__email">{client?.email}</div>
                    {client?.phone && <div className="admin-booking-card__email">{client.phone}</div>}
                  </div>
                  <span className={`admin-badge admin-badge--${b.status === 'confirmed' ? 'active' : b.status === 'pending' ? 'upcoming' : 'inactive'}`}>
                    {STATUS_LABEL[b.status]}
                  </span>
                </div>

                <div className="admin-booking-card__detail">
                  <Clock size={13} strokeWidth={1.5} />
                  {fmt(b.appointment_at)}
                </div>
                <div className="admin-booking-card__service">{b.service}</div>
                {b.notes && <div className="admin-booking-card__notes">{b.notes}</div>}

                {b.status === 'pending' && (
                  <div className="admin-booking-card__actions">
                    <button
                      className="admin-btn admin-btn--danger"
                      onClick={() => updateStatus(b.id, 'rejected')}
                      disabled={acting === b.id}
                    >
                      <XCircle size={13} style={{ display: 'inline', marginRight: 5 }} />
                      Decline
                    </button>
                    <button
                      className="admin-btn admin-btn--primary"
                      onClick={() => updateStatus(b.id, 'confirmed')}
                      disabled={acting === b.id}
                    >
                      <CheckCircle size={13} style={{ display: 'inline', marginRight: 5 }} />
                      Confirm
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
