import { useEffect, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, Upload, UserCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type GuestArtist = {
  id: string
  name: string
  specialty: string | null
  avatar_url: string | null
  bio: string | null
  studio_from: string | null
  studio_until: string | null
  is_active: boolean
}

const EMPTY: Omit<GuestArtist, 'id'> = {
  name: '', specialty: '', avatar_url: null, bio: '',
  studio_from: '', studio_until: '', is_active: true,
}

export function AdminGuestArtists() {
  const [artists, setArtists] = useState<GuestArtist[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState<'add' | 'edit' | null>(null)
  const [form, setForm]       = useState<Omit<GuestArtist, 'id'>>(EMPTY)
  const [editId, setEditId]   = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('guest_artists').select('*').order('name')
    setArtists(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openAdd() {
    setForm(EMPTY); setAvatarFile(null); setError(null); setEditId(null); setModal('add')
  }
  function openEdit(a: GuestArtist) {
    setForm({ name: a.name, specialty: a.specialty ?? '', avatar_url: a.avatar_url, bio: a.bio ?? '',
      studio_from: a.studio_from ?? '', studio_until: a.studio_until ?? '', is_active: a.is_active })
    setAvatarFile(null); setError(null); setEditId(a.id); setModal('edit')
  }

  async function save() {
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError(null)

    let avatar_url = form.avatar_url
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `guest-artists/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
      if (upErr) { setError(upErr.message); setSaving(false); return }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      avatar_url = urlData.publicUrl
    }

    const payload = {
      name: form.name.trim(),
      specialty: form.specialty || null,
      avatar_url,
      bio: form.bio || null,
      studio_from: form.studio_from || null,
      studio_until: form.studio_until || null,
      is_active: form.is_active,
    }

    if (modal === 'add') {
      const { error: err } = await supabase.from('guest_artists').insert(payload)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('guest_artists').update(payload).eq('id', editId!)
      if (err) { setError(err.message); setSaving(false); return }
    }

    setSaving(false); setModal(null); load()
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Remove ${name}?`)) return
    await supabase.from('guest_artists').delete().eq('id', id)
    load()
  }

  function studioRange(a: GuestArtist) {
    if (!a.studio_from && !a.studio_until) return '—'
    const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (a.studio_from && a.studio_until) return `${fmt(a.studio_from)} – ${fmt(a.studio_until)}`
    if (a.studio_from) return `From ${fmt(a.studio_from)}`
    return `Until ${fmt(a.studio_until!)}`
  }

  function isCurrentlyInStudio(a: GuestArtist) {
    const today = new Date().toISOString().split('T')[0]
    const from  = a.studio_from ?? '0000-01-01'
    const until = a.studio_until ?? '9999-12-31'
    return today >= from && today <= until && a.is_active
  }

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Guest Artists</h1>
        <button className="admin-btn admin-btn--primary" onClick={openAdd}>
          <Plus size={14} style={{ display: 'inline', marginRight: 6 }} />
          Add Guest
        </button>
      </div>

      {loading ? (
        <p className="admin-empty">Loading…</p>
      ) : artists.length === 0 ? (
        <p className="admin-empty">No guest artists yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Name</th>
              <th>Specialty</th>
              <th>Studio Dates</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {artists.map(a => (
              <tr key={a.id}>
                <td>
                  {a.avatar_url
                    ? <img src={a.avatar_url} className="admin-table__avatar" alt="" />
                    : <div className="admin-table__avatar--empty" />}
                </td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {a.name}
                    {isCurrentlyInStudio(a) && (
                      <UserCheck size={13} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                    )}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{a.specialty ?? '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{studioRange(a)}</td>
                <td>
                  <span className={`admin-badge admin-badge--${a.is_active ? 'active' : 'inactive'}`}>
                    {a.is_active ? (isCurrentlyInStudio(a) ? 'In Studio' : 'Active') : 'Hidden'}
                  </span>
                </td>
                <td>
                  <div className="admin-actions">
                    <button className="admin-btn admin-btn--ghost" onClick={() => openEdit(a)}><Pencil size={13} /></button>
                    <button className="admin-btn admin-btn--danger" onClick={() => remove(a.id, a.name)}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="admin-modal">
            <h2 className="admin-modal__title">{modal === 'add' ? 'Add Guest Artist' : 'Edit Guest Artist'}</h2>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Name *</label>
              <input className="admin-modal__input" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Specialty</label>
              <input className="admin-modal__input" value={form.specialty ?? ''}
                placeholder="e.g. Japanese Traditional"
                onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} />
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Bio</label>
              <textarea className="admin-modal__textarea" value={form.bio ?? ''}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="admin-modal__field">
                <label className="admin-modal__label">In Studio From</label>
                <input className="admin-modal__input" type="date" value={form.studio_from ?? ''}
                  onChange={e => setForm(f => ({ ...f, studio_from: e.target.value }))} />
              </div>
              <div className="admin-modal__field">
                <label className="admin-modal__label">In Studio Until</label>
                <input className="admin-modal__input" type="date" value={form.studio_until ?? ''}
                  onChange={e => setForm(f => ({ ...f, studio_until: e.target.value }))} />
              </div>
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Photo</label>
              {form.avatar_url && !avatarFile && (
                <img src={form.avatar_url} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', marginBottom: 8, border: '1px solid var(--border-gold)' }} />
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--gold)', fontSize: '0.85rem' }}>
                <Upload size={15} />
                {avatarFile ? avatarFile.name : 'Choose photo…'}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => setAvatarFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Visibility</label>
              <select className="admin-modal__select" value={form.is_active ? 'true' : 'false'}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}>
                <option value="true">Active (visible to public)</option>
                <option value="false">Hidden</option>
              </select>
            </div>

            {error && <p className="admin-modal__error">{error}</p>}

            <div className="admin-modal__actions">
              <button className="admin-btn admin-btn--ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="admin-btn admin-btn--primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save Guest'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
