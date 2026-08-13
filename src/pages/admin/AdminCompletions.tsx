import { useEffect, useState } from 'react'
import { Plus, Upload, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { awardSpendPoints } from '../../lib/awardPoints'
import { StyleSelect } from '../../components/shared/StyleSelect'

type Artist = { id: string; name: string; profile_id: string | null }
type ClientResult = { id: string; full_name: string | null; email: string | null }
type Completion = {
  id: string
  photo_url: string
  style: string | null
  notes: string | null
  completed_at: string
  profiles: { full_name: string | null; email: string | null } | null
}

export function AdminCompletions() {
  const { profile } = useAuth()
  const [artists, setArtists] = useState<Artist[]>([])
  const [_myArtistId, setMyArtistId] = useState<string | null>(null)
  const [selectedArtistId, setSelectedArtistId] = useState<string>('')
  const [completions, setCompletions] = useState<Completion[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)

  // Form state
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<ClientResult[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(null)
  const [style, setStyle] = useState('')
  const [notes, setNotes] = useState('')
  const [price, setPrice] = useState('')
  const [hours, setHours] = useState('')
  const [completedAt, setCompletedAt] = useState(new Date().toISOString().split('T')[0])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isManager = profile?.role === 'manager'

  async function load(artistId: string) {
    setLoading(true)
    const { data } = await supabase
      .from('tattoo_completions')
      .select('id, photo_url, style, notes, completed_at, profiles(full_name, email)')
      .eq('artist_id', artistId)
      .order('completed_at', { ascending: false })
    setCompletions((data as any) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      const { data: artistList } = await supabase
        .from('artists')
        .select('id, name, profile_id')
        .eq('is_active', true)
        .order('name')
      setArtists(artistList ?? [])

      // Find this user's artist record if they're an artist
      const mine = (artistList ?? []).find(a => a.profile_id === profile?.id)
      if (mine) {
        setMyArtistId(mine.id)
        setSelectedArtistId(mine.id)
        load(mine.id)
      } else if (isManager && artistList && artistList.length > 0) {
        setSelectedArtistId(artistList[0].id)
        load(artistList[0].id)
      } else {
        setLoading(false)
      }
    }
    init()
  }, [profile?.id])

  useEffect(() => {
    if (selectedArtistId) load(selectedArtistId)
  }, [selectedArtistId])

  async function searchClients(q: string) {
    setClientSearch(q)
    if (q.length < 2) { setClientResults([]); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(6)
    setClientResults(data ?? [])
  }

  async function save() {
    if (!selectedClient) { setError('Select a client.'); return }
    if (!photoFile) { setError('Upload a photo.'); return }
    if (!selectedArtistId) { setError('No artist selected.'); return }
    setSaving(true)
    setError(null)

    const ext = photoFile.name.split('.').pop()
    const path = `completions/${selectedClient.id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('portfolio')
      .upload(path, photoFile, { upsert: true })
    if (upErr) { setError(upErr.message); setSaving(false); return }

    const { data: urlData } = supabase.storage.from('portfolio').getPublicUrl(path)

    const { data: newComp, error: dbErr } = await supabase
      .from('tattoo_completions')
      .insert({
        profile_id: selectedClient.id,
        artist_id: selectedArtistId,
        photo_url: urlData.publicUrl,
        style: style.trim() || null,
        notes: notes.trim() || null,
        completed_at: completedAt,
        price: price.trim() ? parseFloat(price) : null,
        duration_hours: hours.trim() ? parseFloat(hours) : null,
      })
      .select('id')
      .single()

    if (dbErr) { setError(dbErr.message); setSaving(false); return }

    if (price.trim() && profile?.id) {
      await awardSpendPoints({
        profileId: selectedClient.id,
        price: parseFloat(price),
        awardedBy: profile.id,
        referenceId: newComp?.id,
      })
    }

    setSaving(false)
    setModal(false)
    setSelectedClient(null)
    setClientSearch('')
    setStyle('')
    setNotes('')
    setPrice('')
    setHours('')
    setPhotoFile(null)
    setCompletedAt(new Date().toISOString().split('T')[0])
    load(selectedArtistId)
  }

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Completed Tattoos</h1>
        <button className="admin-btn admin-btn--primary" onClick={() => { setModal(true); setError(null) }}>
          <Plus size={14} style={{ display: 'inline', marginRight: 6 }} />
          Record Tattoo
        </button>
      </div>

      {isManager && artists.length > 1 && (
        <div style={{ marginBottom: 20 }}>
          <select
            className="admin-modal__select"
            value={selectedArtistId}
            onChange={e => setSelectedArtistId(e.target.value)}
            style={{ maxWidth: 240 }}
          >
            {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <p className="admin-empty">Loading…</p>
      ) : completions.length === 0 ? (
        <p className="admin-empty">No completed tattoos recorded yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Client</th>
              <th>Style</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {completions.map(c => (
              <tr key={c.id}>
                <td>
                  <img src={c.photo_url} className="admin-table__img" alt="" />
                </td>
                <td>
                  <div style={{ fontSize: '0.88rem' }}>{(c.profiles as any)?.full_name ?? '—'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{(c.profiles as any)?.email}</div>
                </td>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.style ?? '—'}</td>
                <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {new Date(c.completed_at + 'T12:00:00').toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="admin-modal">
            <h2 className="admin-modal__title">Record Completed Tattoo</h2>

            {isManager && (
              <div className="admin-modal__field">
                <label className="admin-modal__label">Artist</label>
                <select className="admin-modal__select" value={selectedArtistId}
                  onChange={e => setSelectedArtistId(e.target.value)}>
                  {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}

            <div className="admin-modal__field">
              <label className="admin-modal__label">Client (search by name or email) *</label>
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 6, padding: '10px 12px' }}>
                  <Search size={15} color="var(--text-muted)" />
                  <input
                    style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '0.9rem', flex: 1 }}
                    value={selectedClient ? `${selectedClient.full_name ?? ''} (${selectedClient.email})` : clientSearch}
                    onChange={e => { setSelectedClient(null); searchClients(e.target.value) }}
                    placeholder="Search clients…"
                  />
                </div>
                {clientResults.length > 0 && !selectedClient && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a1a', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 6, zIndex: 10, marginTop: 2 }}>
                    {clientResults.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setSelectedClient(c); setClientResults([]) }}
                        style={{ width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: '0.85rem', color: 'var(--text)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        <div>{c.full_name ?? 'No name'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.email}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Date Completed *</label>
              <input className="admin-modal__input" type="date" value={completedAt}
                onChange={e => setCompletedAt(e.target.value)} />
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Style / Category</label>
              <StyleSelect value={style} onChange={setStyle} />
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Notes</label>
              <textarea className="admin-modal__textarea" value={notes}
                placeholder="Any notes about the piece…"
                onChange={e => setNotes(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="admin-modal__field">
                <label className="admin-modal__label">Total Price Charged (R)</label>
                <input className="admin-modal__input" type="number" min="0" step="0.01"
                  value={price} placeholder="e.g. 350"
                  onChange={e => setPrice(e.target.value)} />
              </div>
              <div className="admin-modal__field">
                <label className="admin-modal__label">Hours in Chair</label>
                <input className="admin-modal__input" type="number" min="0" step="0.5"
                  value={hours} placeholder="e.g. 3.5"
                  onChange={e => setHours(e.target.value)} />
              </div>
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Photo of Completed Work *</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--gold)', fontSize: '0.85rem' }}>
                <Upload size={15} />
                {photoFile ? photoFile.name : 'Choose photo…'}
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => setPhotoFile(e.target.files?.[0] ?? null)} />
              </label>
              {photoFile && (
                <img
                  src={URL.createObjectURL(photoFile)}
                  alt=""
                  style={{ marginTop: 8, width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-gold)' }}
                />
              )}
            </div>

            {error && <p className="admin-modal__error">{error}</p>}

            <div className="admin-modal__actions">
              <button className="admin-btn admin-btn--ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="admin-btn admin-btn--primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Record Tattoo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
