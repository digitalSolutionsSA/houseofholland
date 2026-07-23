import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export function AdminDashboard() {
  const [stats, setStats] = useState({ artists: 0, merch: 0, flash: 0, bookings: 0 })

  useEffect(() => {
    async function load() {
      const [a, m, f, b] = await Promise.all([
        supabase.from('artists').select('id', { count: 'exact', head: true }),
        supabase.from('merch').select('id', { count: 'exact', head: true }),
        supabase.from('flash_events').select('id', { count: 'exact', head: true }),
        supabase.from('bookings').select('id', { count: 'exact', head: true }),
      ])
      setStats({
        artists: a.count ?? 0,
        merch: m.count ?? 0,
        flash: f.count ?? 0,
        bookings: b.count ?? 0,
      })
    }
    load()
  }, [])

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Dashboard</h1>
      </div>
      <div className="admin-stats">
        <div className="admin-stat">
          <div className="admin-stat__value">{stats.artists}</div>
          <div className="admin-stat__label">Artists</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{stats.merch}</div>
          <div className="admin-stat__label">Merch Items</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{stats.flash}</div>
          <div className="admin-stat__label">Flash Events</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{stats.bookings}</div>
          <div className="admin-stat__label">Bookings</div>
        </div>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
        Use the sidebar to manage artists, merch, and flash events.
      </p>
    </div>
  )
}
