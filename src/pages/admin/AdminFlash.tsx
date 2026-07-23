import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type FlashEvent = {
  id: string
  title: string
  description: string | null
  date: string
  start_time: string
  end_time: string
  status: 'upcoming' | 'open' | 'closed'
  max_spots: number
  artistIds: string[]
  guestArtistIds: string[]
}

type Artist      = { id: string; name: string; avatar_url: string | null }
type GuestArtist = { id: string; name: string; avatar_url: string | null; specialty: string | null }

type FormState = {
  title: string; description: string; date: string
  start_time: string; end_time: string
  status: FlashEvent['status']; max_spots: number
}

const EMPTY_FORM: FormState = {
  title: '', description: '', date: '', start_time: '10:00',
  end_time: '18:00', status: 'upcoming', max_spots: 10,
}

export function AdminFlash() {
  const [events, setEvents]             = useState<FlashEvent[]>([])
  const [artists, setArtists]           = useState<Artist[]>([])
  const [guestArtists, setGuestArtists] = useState<GuestArtist[]>([])
  const [loading, setLoading]           = useState(true)
  const [modal, setModal]               = useState<'add' | 'edit' | null>(null)
  const [form, setForm]                 = useState<FormState>(EMPTY_FORM)
  const [selectedArtists, setSelectedArtists]           = useState<string[]>([])
  const [selectedGuestArtists, setSelectedGuestArtists] = useState<string[]>([])
  const [editId, setEditId]   = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: ev }, { data: ar }, { data: ga }, { data: junc }, { data: gjunc }] = await Promise.all([
      supabase.from('flash_events').select('*').order('date', { ascending: false }),
      supabase.from('artists').select('id, name, avatar_url').eq('is_active', true).order('name'),
      supabase.from('guest_artists').select('id, name, avatar_url, specialty').eq('is_active', true).order('name'),
      supabase.from('flash_event_artists').select('flash_event_id, artist_id'),
      supabase.from('flash_event_guest_artists').select('flash_event_id, guest_artist_id'),
    ])

    const juncMap: Record<string, string[]>  = {}
    const gjuncMap: Record<string, string[]> = {}
    for (const row of junc  ?? []) { if (!juncMap[row.flash_event_id])  juncMap[row.flash_event_id]  = []; juncMap[row.flash_event_id].push(row.artist_id) }
    for (const row of gjunc ?? []) { if (!gjuncMap[row.flash_event_id]) gjuncMap[row.flash_event_id] = []; gjuncMap[row.flash_event_id].push(row.guest_artist_id) }

    setEvents((ev ?? []).map(e => ({ ...e, artistIds: juncMap[e.id] ?? [], guestArtistIds: gjuncMap[e.id] ?? [] })))
    setArtists(ar ?? [])
    setGuestArtists(ga ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setForm(EMPTY_FORM)
    setSelectedArtists([]); setSelectedGuestArtists([])
    setError(null); setEditId(null); setModal('add')
  }

  function openEdit(ev: FlashEvent) {
    setForm({
      title: ev.title, description: ev.description ?? '',
      date: ev.date, start_time: ev.start_time, end_time: ev.end_time,
      status: ev.status, max_spots: ev.max_spots,
    })
    setSelectedArtists(ev.artistIds)
    setSelectedGuestArtists(ev.guestArtistIds)
    setError(null); setEditId(ev.id); setModal('edit')
  }

  function toggleArtist(id: string) {
    setSelectedArtists(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function toggleGuest(id: string) {
    setSelectedGuestArtists(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function save() {
    if (!form.title.trim()) { setError('Title is required.'); return }
    if (!form.date) { setError('Date is required.'); return }
    setSaving(true); setError(null)

    const payload = {
      title: form.title.trim(),
      description: form.description || null,
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time,
      status: form.status,
      max_spots: Number(form.max_spots),
      artist_id: selectedArtists[0] ?? null,   // keep legacy FK for compat
    }

    let eventId = editId

    if (modal === 'add') {
      const { data, error: err } = await supabase.from('flash_events').insert(payload).select('id').single()
      if (err || !data) { setError(err?.message ?? 'Failed to save'); setSaving(false); return }
      eventId = data.id
    } else {
      const { error: err } = await supabase.from('flash_events').update(payload).eq('id', editId!)
      if (err) { setError(err.message); setSaving(false); return }
    }

    // Sync resident artists junction
    await supabase.from('flash_event_artists').delete().eq('flash_event_id', eventId!)
    if (selectedArtists.length > 0) {
      await supabase.from('flash_event_artists').insert(
        selectedArtists.map(aid => ({ flash_event_id: eventId!, artist_id: aid }))
      )
    }

    // Sync guest artists junction
    await supabase.from('flash_event_guest_artists').delete().eq('flash_event_id', eventId!)
    if (selectedGuestArtists.length > 0) {
      await supabase.from('flash_event_guest_artists').insert(
        selectedGuestArtists.map(gid => ({ flash_event_id: eventId!, guest_artist_id: gid }))
      )
    }

    setSaving(false); setModal(null); load()
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    await supabase.from('flash_events').delete().eq('id', id)
    load()
  }

  function artistNames(ids: string[]) {
    if (!ids.length) return '—'
    return ids.map(id => artists.find(a => a.id === id)?.name ?? '?').join(', ')
  }

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
              <th>Artists</th>
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
                  {new Date(ev.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  {ev.start_time.slice(0, 5)} – {ev.end_time.slice(0, 5)}
                </td>
                <td style={{ fontSize: '0.85rem' }}>
                  {ev.artistIds.length > 0 ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Users size={12} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                      {artistNames(ev.artistIds)}
                    </span>
                  ) : '—'}
                </td>
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
              <input className="admin-modal__input" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Description</label>
              <textarea className="admin-modal__textarea" value={form.description ?? ''}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Date *</label>
              <input className="admin-modal__input" type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="admin-modal__field">
                <label className="admin-modal__label">Start Time</label>
                <input className="admin-modal__input" type="time" value={form.start_time}
                  onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div className="admin-modal__field">
                <label className="admin-modal__label">End Time</label>
                <input className="admin-modal__input" type="time" value={form.end_time}
                  onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>

            {/* ── Resident artist checkboxes ── */}
            <div className="admin-modal__field">
              <label className="admin-modal__label">Resident Artists</label>
              {artists.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No active artists found.</p>
              ) : (
                <div className="admin-flash__artist-list">
                  {artists.map(a => {
                    const checked = selectedArtists.includes(a.id)
                    return (
                      <label key={a.id} className={`admin-flash__artist-row${checked ? ' admin-flash__artist-row--checked' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleArtist(a.id)}
                          className="admin-flash__checkbox"
                        />
                        {a.avatar_url && (
                          <img src={a.avatar_url} alt="" className="admin-flash__artist-avatar" />
                        )}
                        <span className="admin-flash__artist-name">{a.name}</span>
                        {checked && <span className="admin-flash__artist-tick">✓</span>}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── Guest artist checkboxes ── */}
            {guestArtists.length > 0 && (
              <div className="admin-modal__field">
                <label className="admin-modal__label">Guest Artists</label>
                <div className="admin-flash__artist-list">
                  {guestArtists.map(a => {
                    const checked = selectedGuestArtists.includes(a.id)
                    return (
                      <label key={a.id} className={`admin-flash__artist-row${checked ? ' admin-flash__artist-row--checked' : ''}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleGuest(a.id)} className="admin-flash__checkbox" />
                        {a.avatar_url && <img src={a.avatar_url} alt="" className="admin-flash__artist-avatar" />}
                        <span className="admin-flash__artist-name">
                          {a.name}
                          {a.specialty && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {a.specialty}</span>}
                        </span>
                        {checked && <span className="admin-flash__artist-tick">✓</span>}
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="admin-modal__field">
                <label className="admin-modal__label">Max Spots</label>
                <input className="admin-modal__input" type="number" min="1" value={form.max_spots}
                  onChange={e => setForm(f => ({ ...f, max_spots: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="admin-modal__field">
                <label className="admin-modal__label">Status</label>
                <select className="admin-modal__select" value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as FlashEvent['status'] }))}>
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
