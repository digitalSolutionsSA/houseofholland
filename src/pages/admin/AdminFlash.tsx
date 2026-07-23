import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type FlashEvent = {
  id: string
  title: string
  description: string | null
  date: string
  start_time: string
  end_time: string
  artist_id: string | null
  status: 'upcoming' | 'open' | 'closed'
  max_spots: number
}

type Artist = { id: string; name: string }

const EMPTY: Omit<FlashEvent, 'id'> = {
  title: '', description: '', date: '', start_time: '10:00',
  end_time: '18:00', artist_id: null, status: 'upcoming', max_spots: 10,
}

export function AdminFlash() {
  const [events, setEvents] = useState<FlashEvent[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [form, setForm] = useState<Omit<FlashEvent, 'id'>>(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: ev }, { data: ar }] = await Promise.all([
      supabase.from('flash_events').select('*').order('date', { ascending: false }),
      supabase.from('artists').select('id, name').eq('is_active', true).order('name'),
    ])
    setEvents(ev ?? [])
    setArtists(ar ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() { setForm(EMPTY); setError(null); setEditId(null); setModal('add') }
  function openEdit(ev: FlashEvent) {
    setForm({ title: ev.title, description: ev.description ?? '', date: ev.date, start_time: ev.start_time, end_time: ev.end_time, artist_id: ev.artist_id, status: ev.status, max_spots: ev.max_spots })
    setError(null); setEditId(ev.id); setModal('edit')
  }

  async function save() {
    if (!form.title.trim()) { setError('Title is required.'); return }
    if (!form.date) { setError('Date is required.'); return }
    setSaving(true); setError(null)

    const payload = { ...form, max_spots: Number(form.max_spots), artist_id: form.artist_id || null }

    if (modal === 'add') {
      const { error: err } = await supabase.from('flash_events').insert(payload)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('flash_events').update(payload).eq('id', editId!)
      if (err) { setError(err.message); setSaving(false); return }
    }

    setSaving(false); setModal(null); load()
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    await supabase.from('flash_events').delete().eq('id', id)
    load()
  }

  const artistName = (id: string | null) => artists.find(a => a.id === id)?.name ?? '—'

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Flash Events</h1>
        <button className="admin-btn admin-btn--primary" onClick={openAdd}>
          <Plus size={14} style={{ display: 'inline', marginRight: 6 }} />
          Add Event
        </button>
      </div>

      {loading ? (
        <p className="admin-empty">Loading…</p>
      ) : events.length === 0 ? (
        <p className="admin-empty">No flash events yet. Add one above.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Time</th>
              <th>Artist</th>
              <th>Spots</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id}>
                <td>{ev.title}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  {ev.start_time.slice(0, 5)} – {ev.end_time.slice(0, 5)}
                </td>
                <td style={{ fontSize: '0.85rem' }}>{artistName(ev.artist_id)}</td>
                <td>{ev.max_spots}</td>
                <td>
                  <span className={`admin-badge admin-badge--${ev.status}`}>{ev.status}</span>
                </td>
                <td>
                  <div className="admin-actions">
                    <button className="admin-btn admin-btn--ghost" onClick={() => openEdit(ev)}><Pencil size={13} /></button>
                    <button className="admin-btn admin-btn--danger" onClick={() => remove(ev.id, ev.title)}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="admin-modal">
            <h2 className="admin-modal__title">{modal === 'add' ? 'Add Flash Event' : 'Edit Flash Event'}</h2>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Title *</label>
              <input className="admin-modal__input" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Description</label>
              <textarea className="admin-modal__textarea" value={form.description ?? ''} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Date *</label>
              <input className="admin-modal__input" type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="admin-modal__field">
                <label className="admin-modal__label">Start Time</label>
                <input className="admin-modal__input" type="time" value={form.start_time} onChange={(e) => setForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div className="admin-modal__field">
                <label className="admin-modal__label">End Time</label>
                <input className="admin-modal__input" type="time" value={form.end_time} onChange={(e) => setForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Artist</label>
              <select className="admin-modal__select" value={form.artist_id ?? ''} onChange={(e) => setForm(f => ({ ...f, artist_id: e.target.value || null }))}>
                <option value="">— Any / TBA —</option>
                {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="admin-modal__field">
                <label className="admin-modal__label">Max Spots</label>
                <input className="admin-modal__input" type="number" min="1" value={form.max_spots} onChange={(e) => setForm(f => ({ ...f, max_spots: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="admin-modal__field">
                <label className="admin-modal__label">Status</label>
                <select className="admin-modal__select" value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value as FlashEvent['status'] }))}>
                  <option value="upcoming">Upcoming</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            {error && <p className="admin-modal__error">{error}</p>}

            <div className="admin-modal__actions">
              <button className="admin-btn admin-btn--ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="admin-btn admin-btn--primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
